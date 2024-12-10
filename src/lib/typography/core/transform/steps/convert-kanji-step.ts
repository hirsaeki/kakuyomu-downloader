import { BaseTransformStep } from '../base/transform-step';
import type { TransformContext, TransformResult } from '../base/types';
import { TransformError } from '@/lib/errors';

/**
 * 数値を漢数字に変換するステップ
 */
export class ConvertKanjiStep extends BaseTransformStep {
  private static readonly KANJI_NUMS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

  override isApplicable(context: TransformContext): boolean {
    if (!super.isApplicable(context)) return false;
    return !isNaN(parseInt(context.text, 10));  // 数値変換可能性をチェック
  }

  protected async processTransform(context: TransformContext): Promise<TransformResult> {
    try {
      const num = parseInt(context.text, 10);
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