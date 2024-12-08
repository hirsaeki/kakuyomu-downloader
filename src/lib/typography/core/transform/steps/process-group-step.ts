import { BaseTransformStep } from '../base/transform-step';
import type { TransformContext, TransformResult } from '../base/types';
import { TransformError } from '../base/types';

export class ProcessGroupStep extends BaseTransformStep {
  constructor(private group: number) {
    super();
    if (group < 0) {
      throw new TransformError('Group number must be non-negative');
    }
  }

  override isApplicable({ match, reprocess }: TransformContext): boolean {
    if (!super.isApplicable({ text: match?.[this.group] ?? '' })) return false;
    // マッチ情報とグループ内容、再処理関数の存在を確認
    return match !== undefined && 
           this.group < match.length && 
           match[this.group] !== undefined &&
           reprocess !== undefined;
  }

  async execute(context: TransformContext): Promise<TransformResult> {
    if (!this.isApplicable(context)) {
      throw new TransformError('Invalid context for ProcessGroupStep');
    }

    const { match, reprocess } = context;
    // ここではmatch, reprocessの存在は保証されている
    const groupContent = match![this.group];

    try {
      const processed = await reprocess!(groupContent);
      if (processed.length === 0) {
        return this.createResult(groupContent);
      }

      const content = processed
        .map(node => node.textContent)
        .filter((text): text is string => text !== null)
        .join('');

      return this.createResult(content);

    } catch (error) {
      throw new TransformError(
        `Group processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  toString(): string {
    return `ProcessGroupStep(group: ${this.group})`;
  }
}