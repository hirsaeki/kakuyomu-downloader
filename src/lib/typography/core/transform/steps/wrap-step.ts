import { BaseTransformStep } from '../base/transform-step';
import type { TransformContext, TransformResult } from '../base/types';

export class WrapStep extends BaseTransformStep {
  constructor(
    private prefix: string = '',
    private suffix: string = ''
  ) {
    super();
  }

  protected async processTransform(context: TransformContext): Promise<TransformResult> {
    return this.createResult(`${this.prefix}${context.text}${this.suffix}`);
  }

  toString(): string {
    return `WrapStep(prefix: "${this.prefix}", suffix: "${this.suffix}")`;
  }
}