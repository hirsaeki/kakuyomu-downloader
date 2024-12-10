import { BaseTransformStep } from '../base/transform-step';
import type { TransformContext, TransformResult } from '../base/types';
import { TransformError } from '@/lib/errors';

export class SplitByStep extends BaseTransformStep {
  private readonly separators: string[];

  constructor(separator: string | string[]) {
    super();
    this.separators = Array.isArray(separator) ? separator : [separator];
  }

  override isApplicable(context: TransformContext): boolean {
    if (!super.isApplicable(context)) return false;
    return this.separators.some(sep => context.text.includes(sep));  // 区切り文字の存在確認
  }

  protected async processTransform(context: TransformContext): Promise<TransformResult> {
    try {
      let parts: string[] = [context.text];
      
      this.separators.forEach(sep => {
        parts = parts.flatMap(part => 
          part.split(sep).map(p => p.trim()).filter(p => p.length > 0)
        );
      });

      return this.createResult(JSON.stringify(parts));

    } catch (error) {
      throw new TransformError(
        `Split operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  toString(): string {
    return `SplitByStep(separators: ${this.separators.join(', ')})`;
  }
}