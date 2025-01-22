import { BaseTransformStep } from '../base/transform-step';
import type { TransformContext, ProcessedText } from '../types';
import { TransformError } from '@/lib/errors';
import { createContextLogger } from '@/lib/logger';

const splitLogger = createContextLogger('split-by-step');

/**
 * テキストを指定された区切り文字で分割するステップ
 */
export class SplitByStep extends BaseTransformStep {
  private readonly separators: readonly string[];
  // エスケープが必要な特殊文字のパターン
  private static readonly SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;

  constructor(
    separator: string | readonly string[],
    private readonly joinWith: string = '\n'
  ) {
    super();
    this.separators = Array.isArray(separator) ? separator : [separator];

    splitLogger.debug('Initialized split step', {
      separators: this.separators,
      joinWith: this.joinWith
    });

    if (this.separators.length === 0) {
      const message = '区切り文字が指定されていません';
      splitLogger.error(message);
      throw new TransformError(message);
    }

    if (this.separators.some(sep => sep.length === 0)) {
      const message = '空の区切り文字は使用できません';
      splitLogger.error(message);
      throw new TransformError(message);
    }
  }

  override isApplicable(context: TransformContext): boolean {
    if (!super.isApplicable(context)) return false;

    try {
      // 区切り文字の存在確認
      const hasAnyMatch = this.separators.some(sep => context.text.includes(sep));

      splitLogger.debug('Checking applicability', {
        textLength: context.text.length,
        hasAnyMatch,
        separatorsCount: this.separators.length
      });

      return hasAnyMatch;

    } catch (error) {
      splitLogger.error('Error in applicability check', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  protected async processTransform(context: TransformContext): Promise<ProcessedText> {
    splitLogger.debug('Starting text split', {
      textLength: context.text.length,
      separatorsCount: this.separators.length
    });

    try {
      // 空白を除去せずに分割を行う
      let parts = [context.text];

      // 各区切り文字で順番に分割
      this.separators.forEach(sep => {
        const regex = this.createSeparatorRegex(sep);
        parts = this.splitAndProcess(parts, regex);
      });

      // 結果を結合
      const result = parts.join(this.joinWith);

      splitLogger.debug('Split completed', {
        originalLength: context.text.length,
        resultLength: result.length,
        partsCount: parts.length,
        sampleResult: result.slice(0, 100)
      });

      return this.createResult(result);

    } catch (error) {
      const message = `分割処理に失敗しました: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      splitLogger.error('Split failed', {
        error: message,
        textLength: context.text.length
      });
      throw new TransformError(message);
    }
  }

  /**
   * 区切り文字を正規表現に変換
   * 特殊文字をエスケープする
   */
  private createSeparatorRegex(separator: string): RegExp {
    const escapedSeparator = separator.replace(
      SplitByStep.SPECIAL_CHARS,
      '\\$&'
    );
    return new RegExp(escapedSeparator, 'g');
  }

  /**
   * テキスト配列を分割して処理
   */
  private splitAndProcess(parts: string[], regex: RegExp): string[] {
    return parts.flatMap(part => {
      // 空の部分は無視
      if (!part) return [];

      // 区切り文字で分割
      return part
        .split(regex)
        .map(p => p.trim())
        .filter(p => p.length > 0);
    });
  }

  toString(): string {
    return `SplitByStep(separators: [${this.separators.join(', ')}], joinWith: "${this.joinWith}")`;
  }
}