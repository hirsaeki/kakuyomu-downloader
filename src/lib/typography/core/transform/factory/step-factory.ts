import { TransformError } from '../base/types';
import type { TransformStep } from '../base/transform-step';
import type { GeneratedPattern, TransformConfig } from '../../config/generated/patterns';
import { 
  ConvertGroupsStep,
  ConvertKanjiStep, 
  ConvertWidthStep,
  JoinStep,
  ProcessGroupStep,
  ReplaceStep,
  SplitByStep,
  WrapStep
} from '../steps';

/**
 * 変換ステップのファクトリクラス
 * Viteプラグインで生成されたパターン定義からTransformStepを生成
 */
export class StepFactory {
  /**
   * パターン定義から変換ステップを生成
   */
  static createFromPattern(pattern: GeneratedPattern): TransformStep[] {
    if (!pattern.transform || !pattern.transform.steps) {
      throw new TransformError('Invalid pattern: transform steps are required');
    }

    return pattern.transform.steps
      .map(step => this.createStep(step))
      .filter((step): step is TransformStep => step !== null);
  }

  /**
   * 個別のステップを生成
   */
  private static createStep(config: TransformConfig): TransformStep | null {
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

        case 'processGroup':
          if (config.group === undefined) {
            throw new TransformError('Missing group number for processGroup');
          }
          return new ProcessGroupStep(config.group);

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

        case 'convertGroups':
          if (!config.rules || config.rules.length === 0 || !config.group) {
            throw new TransformError('Missing rules or group for convertGroups');
          }
          return new ConvertGroupsStep(
            config.rules.map(rule => ({ group: config.group!, rule }))
          );

        case 'join':
          return new JoinStep(config.template, config.with);

        default:
          console.warn(`Unknown action type: ${config.action}`);
          return null;
      }
    } catch (error) {
      console.error(`Step creation failed:`, error);
      return null;
    }
  }
}