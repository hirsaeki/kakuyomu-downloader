import { 
  type ITransformStep,
  type TransformStepDefinition,
} from '../types';
import { TransformError } from '@/lib/errors';
import { 
  ConvertKanjiStep, 
  ConvertWidthStep,
  JoinStep,
  ReplaceStep,
  SplitByStep,
  WrapStep
} from '../steps';
import { createContextLogger } from '@/lib/logger';
import type { GeneratedPattern } from 'virtual:pattern-config';

const factoryLogger = createContextLogger('step-factory');

/**
 * 変換ステップのファクトリクラス
 * Viteプラグインで生成されたパターン定義からTransformStepを生成
 */
export class StepFactory {
  /**
   * パターン定義から変換ステップを生成
   */
  static createFromPattern(pattern: GeneratedPattern): ITransformStep[] {
    factoryLogger.debug('Creating steps from pattern', {
      patternName: pattern.name,
      stepsCount: pattern.transform.steps.length
    });

    if (!pattern.transform?.steps) {
      factoryLogger.error('Invalid pattern: transform steps are required');
      throw new TransformError('Invalid pattern: transform steps are required');
    }

    return pattern.transform.steps
      .map((step: TransformStepDefinition, index: number) => {
        try {
          return this.createStep(step);
        } catch (error) {
          factoryLogger.error(`Step creation failed at index ${index}`, {
            step,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          return null;
        }
      })
      .filter((step: unknown): step is ITransformStep => step !== null);
  }

  /**
   * 個別のステップを生成
   */
  private static createStep(config: TransformStepDefinition): ITransformStep | null {
    try {
      switch (config.action) {
        case 'wrap':
          return new WrapStep(config.prefix, config.suffix);

        case 'convertWidth':
          if (!config.target || !config.direction) {
            throw new TransformError('Missing target or direction for convertWidth');
          }
          return new ConvertWidthStep(config.direction, config.target);

        case 'replace':
          if (!config.from || !config.to) {
            throw new TransformError('Missing from or to for replace');
          }
          return new ReplaceStep(config.from, config.to);

        case 'splitBy':
          if (!config.separator) {
            throw new TransformError('Missing separator for splitBy');
          }
          return new SplitByStep(config.separator);

        case 'convertEach':
          if (!config.rules || config.rules.length === 0) {
            throw new TransformError('Missing rules for convertEach');
          }
          // とりあえず最初のルールだけ適用（YAGNI: 必要になったら拡張）
          return config.rules[0].type === 'toKanji' ? 
            new ConvertKanjiStep() :
            null;

        case 'join':
          return new JoinStep(config.template, config.with);

        default:
          factoryLogger.warn(`Unknown action type: ${config.action}`);
          return null;
      }
    } catch (error) {
      factoryLogger.error(`Step creation failed:`, error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
}