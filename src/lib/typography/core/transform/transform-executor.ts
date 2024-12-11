import type { TransformStep } from './base/transform-step';
import type { TransformContext, TransformResult } from './base/types';
// @ts-expect-error Viteプラグインで作成されるtsファイル
import type { GeneratedPattern } from '../config/generated/patterns';
import { TransformError } from '@/lib/errors';
import { StepFactory } from './factory/step-factory';
import { createContextLogger } from '@/lib/logger';

const transformLogger = createContextLogger('typography-transform');

/**
 * 変換処理の実行を管理するExecutor
 */
export class TransformExecutor {
  private steps: TransformStep[] = [];

  /**
   * パターンからExecutorを生成するファクトリメソッド
   */
  static fromPattern(pattern: GeneratedPattern): TransformExecutor {
    transformLogger.info('Creating executor from pattern');
    const executor = new TransformExecutor();
    const steps = StepFactory.createFromPattern(pattern);
    transformLogger.debug('Steps created from pattern', { 
      stepCount: steps.length,
      patternType: pattern.type 
    });
    steps.forEach(step => executor.addStep(step));
    return executor;
  }

  /**
   * 変換ステップを追加（テスト用に残しておく）
   */
  private addStep(step: TransformStep): this {
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

    let result = context.text;
    
    for (const step of this.steps) {
      try {
        transformLogger.debug(`Executing step: ${step.constructor.name}`, {
          currentTextLength: result.length
        });

        if (step.isApplicable({ ...context, text: result })) {
          const stepResult = await step.execute({ 
            ...context,
            text: result 
          });
          result = stepResult.content;

          transformLogger.debug(`Step completed: ${step.constructor.name}`, {
            newTextLength: result.length,
            resultType: stepResult.type
          });
        } else {
          transformLogger.debug(`Step skipped: ${step.constructor.name} (not applicable)`);
        }
      } catch (error) {
        transformLogger.error(`Step failed: ${step.constructor.name}`, error);
        throw new TransformError(
          `Transform step failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    transformLogger.info('Transform execution completed', {
      finalTextLength: result.length,
      stepsExecuted: this.steps.length
    });

    return { type: 'text', content: result };
  }
}