import type { ITransformStep } from './types';
import type { TransformContext, ProcessedText } from './types';
import type { GeneratedPattern } from 'virtual:pattern-config';
import { TransformError } from '@/lib/errors';
import { StepFactory } from './factory/step-factory';
import { createContextLogger } from '@/lib/logger';

const transformLogger = createContextLogger('typography-transform');

/**
 * テキストベースの変換処理を実行するExecutor
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
      patternType: pattern.transform.type
    });
    steps.forEach(step => executor.addStep(step));
    return executor;
  }

  /**
   * 変換ステップを追加
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
  async execute(context: TransformContext, pattern: GeneratedPattern): Promise<ProcessedText> {
    transformLogger.info('Starting transform execution', {
      initialTextLength: context.text?.length ?? 0,
      stepsCount: this.steps.length,
      patternName: pattern.name,
      targetType: pattern.transform.type
    });

    // 変換処理の実行
    const { content: processedText } = await this.executeTransformSteps(context);

    // TCYの場合はマーカーで囲む
    let resultText = processedText;
    if (pattern.transform.type === 'tcy') {
      transformLogger.debug('Adding TCY markers', { 
        pattern: pattern.name,
        text: processedText 
      });
      resultText = `†${processedText}‡`;
    }

    // 前後の空白を制御
    const { ensureSpace } = pattern.transform;
    if (ensureSpace) {
      if (ensureSpace.before && !resultText.startsWith(' ')) {
        resultText = ` ${resultText}`;
      }
      if (ensureSpace.after && !resultText.endsWith(' ')) {
        resultText = `${resultText} `;
      }
    }

    transformLogger.info('Transform execution completed', {
      finalTextLength: resultText.length,
      nodeType: pattern.transform.type,
      stepsExecuted: this.steps.length,
      ensureSpaceBefore: ensureSpace?.before,
      ensureSpaceAfter: ensureSpace?.after
    });

    return { textContent: resultText };
  }

  /**
   * 全ての変換ステップを実行
   */
  private async executeTransformSteps(context: TransformContext): Promise<ProcessedText> {
    if (!context.text) {
      transformLogger.error('Transform execution failed: No text provided');
      throw new TransformError('No text provided for transformation');
    }

    if (this.steps.length === 0) {
      transformLogger.warn('No transform steps registered');
      return { content: context.text };
    }

    let currentText = context.text;
    
    for (const step of this.steps) {
      try {
        const stepContext = {
          ...context,
          text: currentText
        };

        transformLogger.debug(`Checking step: ${step.constructor.name}`, {
          currentTextLength: currentText.length
        });

        const applicable = await this.checkStepApplicability(step, stepContext);
        
        if (applicable) {
          transformLogger.debug(`Executing step: ${step.constructor.name}`);
          const result = await step.execute(stepContext);
          currentText = result.content;
          transformLogger.debug(`Step completed: ${step.constructor.name}`, {
            newTextLength: currentText.length
          });
        } else {
          transformLogger.debug(`Step skipped: ${step.constructor.name}`, {
            reason: 'Content not applicable for this transform step',
            contentLength: currentText.length
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? 
          error.message : 
          'Unknown error';

        transformLogger.error(`Step failed: ${step.constructor.name}`, {
          error: errorMessage,
          content: currentText.substring(0, 100)
        });
        
        throw new TransformError(
          `Transform step failed (${step.constructor.name}): ${errorMessage}`
        );
      }
    }

    return { content: currentText };
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