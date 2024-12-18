import type { ITransformStep } from '../transform/types';
import type { TransformContext, TransformResult } from './types';
import type { GeneratedPattern } from 'virtual:pattern-config';
import { TransformError } from '@/lib/errors';
import { StepFactory } from './factory/step-factory';
import { createContextLogger } from '@/lib/logger';

const transformLogger = createContextLogger('typography-transform');

/**
 * 変換処理の実行を管理するExecutor
 */
export class TransformExecutor {
  private steps: ITransformStep[] = [];

  /**
   * パターンからExecutorを生成するファクトリメソッド
   */
  static fromPattern(pattern: GeneratedPattern): TransformExecutor {
    transformLogger.info('Creating executor from pattern');
    const executor = new TransformExecutor();
    const steps = StepFactory.createFromPattern(pattern);
    transformLogger.debug('Steps created from pattern', { 
      stepCount: steps.length,
      patternType: pattern.transform.type  // pattern.typeをpattern.transform.typeに修正
    });
    steps.forEach(step => executor.addStep(step));
    return executor;
  }

  /**
   * 変換ステップを追加（テスト用に残しておく）
   */
  private addStep(step: ITransformStep): this {
    transformLogger.debug('Adding transform step', { 
      stepType: step.constructor.name 
    });
    this.steps.push(step);
    return this;
  }

  /**
   * 変換処理を実行
   */
  async execute(context: TransformContext): Promise<TransformResult> {
    transformLogger.info('Starting transform execution', {
        initialTextLength: context.text?.length ?? 0,
        stepsCount: this.steps.length
    });

    if (!context.text) {
        transformLogger.error('Transform execution failed: No text provided');
        throw new TransformError('No text provided for transformation');
    }

    if (this.steps.length === 0) {
        transformLogger.warn('No transform steps registered');
        return { type: 'text', content: context.text };
    }

    let currentResult: TransformResult = { 
        type: 'text', 
        content: context.text 
    };
    
    for (const step of this.steps) {
        try {
            const stepContext = {
                ...context,
                text: currentResult.content,
                previousType: currentResult.type
            };

            transformLogger.debug(`Checking step: ${step.constructor.name}`, {
                currentTextLength: currentResult.content.length,
                currentType: currentResult.type
            });

            const applicable = await this.checkStepApplicability(step, stepContext);
            
            if (applicable) {
                transformLogger.debug(`Executing step: ${step.constructor.name}`);
                
                const stepResult = await step.execute(stepContext);
                currentResult = stepResult;

                transformLogger.debug(`Step completed: ${step.constructor.name}`, {
                    newTextLength: stepResult.content.length,
                    resultType: stepResult.type
                });
            } else {
                transformLogger.debug(`Step skipped: ${step.constructor.name}`, {
                    reason: 'Content not applicable for this transform step',
                    contentLength: currentResult.content.length
                });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? 
                error.message : 
                'Unknown error';

            transformLogger.error(`Step failed: ${step.constructor.name}`, {
                error: errorMessage,
                content: currentResult.content.substring(0, 100)
            });
            
            throw new TransformError(
                `Transform step failed (${step.constructor.name}): ${errorMessage}`
            );
        }
    }

    transformLogger.info('Transform execution completed', {
        finalTextLength: currentResult.content.length,
        finalType: currentResult.type,
        stepsExecuted: this.steps.length
    });

    return currentResult;
}

private async checkStepApplicability(
    step: ITransformStep, 
    context: TransformContext
): Promise<boolean> {
    try {
        return step.isApplicable(context);
    } catch (error) {
        transformLogger.warn(`Applicability check failed: ${step.constructor.name}`, {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return false;  // エラーの場合は安全のためfalse
    }
  }
}