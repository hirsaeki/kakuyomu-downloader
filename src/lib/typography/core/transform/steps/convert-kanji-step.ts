import { BaseTransformStep } from '../base/transform-step';
import type { TransformContext, ProcessedText } from '../types';
import { TransformError } from '@/lib/errors';
import { createContextLogger } from '@/lib/logger';

const kanjiLogger = createContextLogger('convert-kanji-step');

/**
 * 数値を漢数字に変換するステップ
 */
export class ConvertKanjiStep extends BaseTransformStep {
  private static readonly KANJI_NUMS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const;
  private static readonly NUMBER_PATTERN = /^\d+$/;
  private static readonly MAX_SAFE_LENGTH = 16;  // 安全に処理可能な最大桁数

  constructor() {
    super();
    kanjiLogger.debug('Initialized kanji converter');
  }

  override isApplicable({ text }: TransformContext): boolean {
    if (!super.isApplicable({ text })) return false;

    try {
      const trimmed = text.trim();
      const isValidNumber = ConvertKanjiStep.NUMBER_PATTERN.test(trimmed);

      kanjiLogger.debug('Checking applicability', {
        textLength: text.length,
        trimmedLength: trimmed.length,
        isValidNumber
      });

      if (trimmed.length > ConvertKanjiStep.MAX_SAFE_LENGTH) {
        kanjiLogger.warn('Text exceeds safe length', {
          length: trimmed.length,
          maxSafe: ConvertKanjiStep.MAX_SAFE_LENGTH
        });
        return false;
      }

      return isValidNumber;

    } catch (error) {
      kanjiLogger.error('Error in applicability check', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  protected async processTransform({ text }: TransformContext): Promise<ProcessedText> {
    kanjiLogger.debug('Starting kanji conversion', {
      textLength: text.length,
      text: text
    });

    try {
      const trimmed = text.trim();
      
      // 数値の妥当性チェック
      if (!/^\d+$/.test(trimmed)) {
        throw new Error('Invalid number format');
      }

      // 漢数字への変換
      const converted = this.convertToKanji(trimmed);

      kanjiLogger.debug('Conversion completed', {
        originalLength: text.length,
        resultLength: converted.length,
        original: text,
        converted
      });

      return this.createResult(converted);

    } catch (error) {
      const message = `漢数字変換に失敗しました: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      kanjiLogger.error('Conversion failed', {
        error: message,
        text
      });
      throw new TransformError(message);
    }
  }

  /**
   * 数値文字列を漢数字に変換
   */
  private convertToKanji(numberStr: string): string {
    return numberStr
      .split('')
      .map(digit => {
        const num = parseInt(digit, 10);
        if (isNaN(num) || num < 0 || num > 9) {
          throw new Error(`Invalid digit: ${digit}`);
        }
        return ConvertKanjiStep.KANJI_NUMS[num];
      })
      .join('');
  }

  toString(): string {
    return 'ConvertKanjiStep()';
  }
}