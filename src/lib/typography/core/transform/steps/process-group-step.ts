import { createContextLogger } from '@/lib/logger';
import { BaseTransformStep } from '../base/transform-step';
import type { TransformContext, ProcessedText } from '../types';
import { TransformError } from '@/lib/errors';

const stepLogger = createContextLogger('typography-step');

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
    const match = context.match;
    const reprocess = context.reprocess;
    const groupContent = match?.[this.group];

    stepLogger.debug(`Processing group ${this.group}`, {
      hasMatch: !!match,
      hasReprocess: !!reprocess,
      groupContent: groupContent,
      matchLength: match?.length
    });

    // まず必要な要素の存在確認
    if (context.match === undefined || 
        this.group >= context.match.length || 
        context.match[this.group] === undefined || 
        context.reprocess === undefined) {
        stepLogger.debug(`Group ${this.group} not applicable`, {
          hasMatch: !!match,
          hasReprocess: !!reprocess,
          invalidGroup: this.group >= (match?.length ?? 0)
        });
        return false;
    }
    
    // 親クラスのチェックは有効なグループ内容に対して行う
    return super.isApplicable({ text: context.match[this.group] });
  }

  protected async processTransform(context: TransformContext): Promise<ProcessedText> {
    if (!this.isApplicable(context)) {  // このチェックは型ガードとしても機能する
      throw new TransformError('Invalid context for ProcessGroupStep');
    }

    // この時点でcontextはProcessGroupContextとして扱える
    const groupContent = context.match[this.group];

    try {
      stepLogger.debug('Starting group content processing', {
        group: this.group,
        content: groupContent
      });

      const processed = await context.reprocess(groupContent);
      
      if (processed.length === 0) {
        stepLogger.debug('No processing results, using original content', {
          group: this.group
        });
        return this.createResult(groupContent);
      }

      const content = processed
        .map(node => node.textContent)
        .filter((text): text is string => text !== null)
        .join('');

      stepLogger.debug('Group processing completed', {
        group: this.group,
        originalLength: groupContent.length,
        processedLength: content.length
      });

      return this.createResult(content);

    } catch (error) {
      stepLogger.error('Group processing failed', {
        group: this.group,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new TransformError(
        `Group processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  toString(): string {
    return `ProcessGroupStep(group: ${this.group})`;
  }
}