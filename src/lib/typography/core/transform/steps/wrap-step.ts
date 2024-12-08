import { BaseTransformStep } from '../base/transform-step';
import type { TransformContext, TransformResult } from '../base/types';
import { TransformError } from '../base/types';

export class WrapStep extends BaseTransformStep {
  constructor(
    private prefix: string = '',
    private suffix: string = ''
  ) {
    super();
  }

  override isApplicable({ text }: TransformContext): boolean {
    return super.isApplicable({ text });  // 基本的な文字列チェックで十分
  }

  async execute({ text }: TransformContext): Promise<TransformResult> {
    if (!this.isApplicable({ text })) {
      throw new TransformError('Invalid text content for WrapStep');
    }

    return this.createResult(`${this.prefix}${text}${this.suffix}`);
  }

  toString(): string {
    return `WrapStep(prefix: "${this.prefix}", suffix: "${this.suffix}")`;
  }
}