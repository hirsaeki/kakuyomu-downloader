import { BaseTransformStep } from '../base/transform-step';
import type { TransformContext, TransformResult } from '../base/types';
import { TransformError } from '../base/types';

/**
 * 数値を漢数字に変換するステップ
 */
export class ConvertKanjiStep extends BaseTransformStep {
  private static readonly KANJI_NUMS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

  override isApplicable({ text }: TransformContext): boolean {
    if (!super.isApplicable({ text })) return false;
    return !isNaN(parseInt(text, 10));  // 数値変換可能性をチェック
  }

  async execute({ text }: TransformContext): Promise<TransformResult> {
    if (!this.isApplicable({ text })) {
      throw new TransformError('Invalid text content for ConvertKanjiStep');
    }

    try {
      const num = parseInt(text, 10);
      const converted = num.toString()
        .split('')
        .map(d => ConvertKanjiStep.KANJI_NUMS[parseInt(d, 10)])
        .join('');
        
      return this.createResult(converted);
    } catch (error) {
      throw new TransformError(
        `Kanji conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  toString(): string {
    return 'ConvertKanjiStep()';
  }
}