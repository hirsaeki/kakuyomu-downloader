import { BaseTransformStep } from '../../base/transform-step';
import type { TransformContext, TransformResult } from '../../base/types';

export class ParagraphTransformStep extends BaseTransformStep {
  protected async processTransform(context: TransformContext): Promise<TransformResult> {
    const paragraphs = context.text.split(/\n{2,}/).map(p => p.trim());
    const processedText = paragraphs
      .filter(p => p.length > 0)
      .map(p => `<p>${p}</p>`)
      .join('\n');

    return this.createResult(processedText);
  }
}
