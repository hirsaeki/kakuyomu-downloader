import { BaseTransformStep } from '../base/transform-step';
import type { TransformContext, ProcessedText } from '../types';
import { TransformError } from '@/lib/errors';
import { createContextLogger } from '@/lib/logger';

const wrapLogger = createContextLogger('wrap-step');

/**
 * テキストをプレフィックスとサフィックスで囲むステップ
 */
export class WrapStep extends BaseTransformStep {
  private static readonly MAX_AFFIX_LENGTH = 100;  // 適切な長さ制限

  constructor(
    private readonly prefix: string = '',
    private readonly suffix: string = ''
  ) {
    super();
    this.validateAffixes();

    wrapLogger.debug('Initialized wrap step', {
      prefix: this.prefix || '(empty)',
      suffix: this.suffix || '(empty)',
      prefixLength: this.prefix.length,
      suffixLength: this.suffix.length
    });
  }

  /**
   * プレフィックスとサフィックスの妥当性を検証
   * @throws {TransformError} 無効な値が指定された場合
   */
  private validateAffixes(): void {
    // 異常な長さのチェック
    if (this.prefix.length > WrapStep.MAX_AFFIX_LENGTH) {
      const message = `プレフィックスが長すぎます（最大${WrapStep.MAX_AFFIX_LENGTH}文字）`;
      wrapLogger.error(message, { prefixLength: this.prefix.length });
      throw new TransformError(message);
    }

    if (this.suffix.length > WrapStep.MAX_AFFIX_LENGTH) {
      const message = `サフィックスが長すぎます（最大${WrapStep.MAX_AFFIX_LENGTH}文字）`;
      wrapLogger.error(message, { suffixLength: this.suffix.length });
      throw new TransformError(message);
    }

    // 制御文字のチェック
    const controlChars = /[\x00-\x1F\x7F]/;
    if (controlChars.test(this.prefix) || controlChars.test(this.suffix)) {
      const message = '制御文字は使用できません';
      wrapLogger.error(message);
      throw new TransformError(message);
    }
  }

  override isApplicable({ text }: TransformContext): boolean {
    if (!super.isApplicable({ text })) return false;

    try {
      // 結果の長さチェック
      const resultLength = this.prefix.length + text.length + this.suffix.length;
      const isLengthValid = resultLength <= 1000000;  // 1MB以下を妥当とする

      wrapLogger.debug('Checking applicability', {
        textLength: text.length,
        resultLength,
        isLengthValid
      });

      if (!isLengthValid) {
        wrapLogger.warn('Result would be too long', { resultLength });
      }

      return isLengthValid;

    } catch (error) {
      wrapLogger.error('Error in applicability check', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  protected async processTransform({ text }: TransformContext): Promise<ProcessedText> {
    wrapLogger.debug('Starting text wrap', {
      textLength: text.length,
      hasPrefix: !!this.prefix,
      hasSuffix: !!this.suffix
    });

    try {
      const wrapped = `${this.prefix}${text}${this.suffix}`;

      wrapLogger.debug('Wrap completed', {
        originalLength: text.length,
        wrappedLength: wrapped.length,
        sampleResult: wrapped.slice(0, 100)
      });

      return this.createResult(wrapped);

    } catch (error) {
      const message = `テキストのラップに失敗しました: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      wrapLogger.error('Wrap failed', {
        error: message,
        textLength: text.length
      });
      throw new TransformError(message);
    }
  }

  toString(): string {
    const displayPrefix = this.prefix || '(empty)';
    const displaySuffix = this.suffix || '(empty)';
    return `WrapStep(prefix: "${displayPrefix}", suffix: "${displaySuffix}")`;
  }
}