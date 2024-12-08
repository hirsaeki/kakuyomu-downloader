import { BaseTransformStep } from '../base/transform-step';
import type { TransformContext, TransformResult } from '../base/types';
import { TransformError } from '../base/types';

export class SplitByStep extends BaseTransformStep {
  private readonly separators: string[];

  constructor(separator: string | string[]) {
    super();
    this.separators = Array.isArray(separator) ? separator : [separator];
  }

  override isApplicable({ text }: TransformContext): boolean {
    if (!super.isApplicable({ text })) return false;
    return this.separators.some(sep => text.includes(sep));  // 区切り文字の存在確認
  }

  async execute({ text }: TransformContext): Promise<TransformResult> {
    if (!this.isApplicable({ text })) {
      throw new TransformError('Invalid text content for SplitByStep');
    }

    try {
      let parts: string[] = [text];
      
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