import { BaseTransformStep } from '../base/transform-step';
import type { TransformContext, TransformResult } from '../base/types';
import { TransformError } from '@/lib/errors';

interface ProcessGroupContext extends TransformContext {
  match: RegExpExecArray;
  reprocess: (text: string) => Promise<Node[]>;
}

export class ProcessGroupStep extends BaseTransformStep {
  constructor(private group: number) {
    super();
    if (group < 0) {
      throw new TransformError('Group number must be non-negative');
    }
  }

  override isApplicable(context: TransformContext): context is ProcessGroupContext {
    if (!super.isApplicable({ text: context.match?.[this.group] ?? '' })) return false;
    // マッチ情報とグループ内容、再処理関数の存在を確認
    return context.match !== undefined && 
           this.group < context.match.length && 
           context.match[this.group] !== undefined &&
           context.reprocess !== undefined;
  }

  protected async processTransform(context: TransformContext): Promise<TransformResult> {
    if (!this.isApplicable(context)) {  // このチェックは型ガードとしても機能する
      throw new TransformError('Invalid context for ProcessGroupStep');
    }

    // この時点でcontextはProcessGroupContextとして扱える
    const groupContent = context.match[this.group];

    try {
      const processed = await context.reprocess(groupContent);
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