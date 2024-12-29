import { BaseTransformStep } from '../base/transform-step';
import type { TransformContext, ProcessedText } from '../types';

export class WrapStep extends BaseTransformStep {
  constructor(
    private prefix: string = '',
    private suffix: string = ''
  ) {
    super();
  }

  protected async processTransform(context: TransformContext): Promise<ProcessedText> {
    return this.createResult(`${this.prefix}${context.text}${this.suffix}`);
  }

  toString(): string {
    return `WrapStep(prefix: "${this.prefix}", suffix: "${this.suffix}")`;
  }
}