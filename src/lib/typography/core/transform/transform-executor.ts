import type { TransformStep } from './base/transform-step';
import type { TransformContext, TransformResult } from './base/types';
import type { GeneratedPattern } from '../config/generated/patterns';
import { TransformError } from './base/types';
import { StepFactory } from './factory/step-factory';
import { createContextLogger } from '@/lib/logger';

const transformLogger = createContextLogger('TransformExecutor');

/**
 * 変換処理の実行を管理するExecutor
 */
export class TransformExecutor {
  private steps: TransformStep[] = [];

  /**
   * パターンからExecutorを生成するファクトリメソッド
   */
  static fromPattern(pattern: GeneratedPattern): TransformExecutor {
    const executor = new TransformExecutor();
    const steps = StepFactory.createFromPattern(pattern);
    steps.forEach(step => executor.addStep(step));
    return executor;
  }

  /**
   * 変換ステップを追加（テスト用に残しておく）
   */
  private addStep(step: TransformStep): this {
    this.steps.push(step);
    return this;
  }

  /**
   * 変換処理を実行
   */
  async execute(context: TransformContext): Promise<TransformResult> {
    if (!context.text) {
      throw new TransformError('No text provided for transformation');
    }

    if (this.steps.length === 0) {
      transformLogger.warn('No transform steps registered');
      return { type: 'text', content: context.text };
    }

    let result = context.text;
    
    for (const step of this.steps) {
      try {
        if (step.isApplicable({ ...context, text: result })) {
          const stepResult = await step.execute({ 
            ...context,
            text: result 
          });
          result = stepResult.content;

          transformLogger.debug(`Transform step completed`, {
            step: step.constructor.name,
            result: stepResult
          });
        }
      } catch (error) {
        throw new TransformError(
          `Transform step failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return { type: 'text', content: result };
  }
}