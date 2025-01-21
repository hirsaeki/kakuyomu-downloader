import { BaseTransformStep } from '../base/transform-step';
import type { TransformContext, ProcessedText } from '../types';
import { TransformError } from '@/lib/errors';
import { createContextLogger } from '@/lib/logger';

const joinLogger = createContextLogger('join-step');

/**
 * 文字列の結合を行うステップ
 * テンプレートモードとセパレータモードをサポート
 */
export class JoinStep extends BaseTransformStep {
  // テンプレートのプレースホルダーパターン
  private static readonly PLACEHOLDER_PATTERN = /\{(\d+)\}/g;
  // 行分割パターン
  private static readonly LINE_SPLIT_PATTERN = /\r?\n/;

  constructor(
    private readonly template?: string,
    private readonly separator: string = ''
  ) {
    super();
    joinLogger.debug('Initialized join step', {
      hasTemplate: !!template,
      separator: separator || '(empty)'
    });

    if (template && template.match(JoinStep.PLACEHOLDER_PATTERN) === null) {
      const message = 'テンプレートにプレースホルダーが含まれていません';
      joinLogger.warn(message, { template });
      // 警告のみ出して処理は継続（無効なテンプレートは単純な文字列として扱う）
    }
  }

  override isApplicable({ text }: TransformContext): boolean {
    if (!super.isApplicable({ text })) return false;

    try {
      // テンプレートモードの場合は常に適用可能
      if (this.template !== undefined) return true;

      // セパレータモードの場合は複数行があるかチェック
      const lines = text.split(JoinStep.LINE_SPLIT_PATTERN);
      const hasMultipleLines = lines.length > 1;

      joinLogger.debug('Checking applicability', {
        textLength: text.length,
        lineCount: lines.length,
        hasMultipleLines
      });

      return hasMultipleLines;

    } catch (error) {
      joinLogger.error('Error in applicability check', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  protected async processTransform({ text }: TransformContext): Promise<ProcessedText> {
    joinLogger.debug('Starting text join', {
      textLength: text.length,
      hasTemplate: !!this.template
    });

    try {
      // 行分割
      const parts = text
        .split(JoinStep.LINE_SPLIT_PATTERN)
        .map(part => part.trim())
        .filter(part => part.length > 0);

      joinLogger.debug('Text split into parts', {
        partsCount: parts.length
      });

      let result: string;
      if (this.template) {
        result = this.applyTemplate(parts);
      } else {
        result = this.joinWithSeparator(parts);
      }

      joinLogger.debug('Join completed', {
        originalLength: text.length,
        resultLength: result.length,
        partsCount: parts.length,
        sampleResult: result.slice(0, 100)
      });

      return this.createResult(result);

    } catch (error) {
      const message = `結合処理に失敗しました: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      joinLogger.error('Join failed', {
        error: message,
        textLength: text.length
      });
      throw new TransformError(message);
    }
  }

  /**
   * テンプレートを適用して文字列を生成
   */
  private applyTemplate(parts: string[]): string {
    return this.template!.replace(
      JoinStep.PLACEHOLDER_PATTERN,
      (_, index) => {
        const i = parseInt(index, 10) - 1;
        if (i < 0 || i >= parts.length) {
          joinLogger.warn('Template index out of bounds', {
            index: i + 1,
            partsLength: parts.length
          });
          return '';
        }
        return parts[i];
      }
    );
  }

  /**
   * セパレータを使用して文字列を結合
   */
  private joinWithSeparator(parts: string[]): string {
    return parts.join(this.separator);
  }

  toString(): string {
    return this.template
      ? `JoinStep(template: "${this.template}")`
      : `JoinStep(separator: "${this.separator}")`;
  }
}