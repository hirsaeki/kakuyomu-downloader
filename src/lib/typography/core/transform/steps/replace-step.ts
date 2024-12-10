import { BaseTransformStep } from '../base/transform-step';
import type { TransformContext, TransformResult } from '../base/types';
import { TransformError } from '@/lib/errors';

/**
 * テキストの置換を行うステップ
 * structure.ymlやsymbol.ymlでの記号変換などに使用
 */
export class ReplaceStep extends BaseTransformStep {
  private pattern: RegExp;

  constructor(
    private from: string,
    private to: string,
    // 固定でgフラグを付けることで、複数箇所の置換を保証
    flags: string = 'g'
  ) {
    super();
    try {
      this.pattern = new RegExp(from, flags);
    } catch (error) {
      throw new TransformError(
        `Invalid regular expression: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  protected async processTransform(context: TransformContext): Promise<TransformResult> {
    try {
      // KISS: シンプルなreplace操作のみ
      const result = context.text.replace(this.pattern, this.to);
      return this.createResult(result);
    } catch (error) {
      throw new TransformError(
        `Replace operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  toString(): string {
    return `ReplaceStep(from: "${this.from}", to: "${this.to}")`;
  }
}