import { BaseTransformStep } from '../base/transform-step';
import type { 
  TransformContext, 
  TransformResult,
  ConversionRule
} from '../base/types';
import { TransformError } from '../base/types';
import { ConvertKanjiStep } from './convert-kanji-step';
import { ConvertWidthStep } from './convert-width-step';

export class ConvertGroupsStep extends BaseTransformStep {
  private kanjiConverter: ConvertKanjiStep;
  private widthConverter: ConvertWidthStep;

  constructor(
    private rules: Array<{
      group: number;
      rule: ConversionRule;
    }>
  ) {
    super();
    this.kanjiConverter = new ConvertKanjiStep();
    this.widthConverter = new ConvertWidthStep('fullwidth', 'numbers');
  }

  override isApplicable({ text, match }: TransformContext): boolean {
    if (!super.isApplicable({ text })) return false;
    if (!match) return false;

    // 全てのグループと対応するルールが適用可能かチェック
    return this.rules.every(({ group, rule }) => {
      const content = match[group];
      if (content === undefined) return false;
      
      return rule.type === 'toKanji' ? 
        this.kanjiConverter.isApplicable({ text: content }) :
        this.widthConverter.isApplicable({ text: content });
    });
  }

  async execute(context: TransformContext): Promise<TransformResult> {
    if (!this.isApplicable(context)) {
      throw new TransformError('Invalid context for ConvertGroupsStep');
    }

    const { match } = context;
    if (!match) {
      throw new TransformError('Invalid context: match is required');
    }
    try {
      const convertedGroups = await Promise.all(
        this.rules.map(async ({ group, rule }) => {
          const groupContent = match[group];
          return this.applyRule(groupContent, rule);
        })
      );

      if (convertedGroups.some(result => result === null)) {
        throw new TransformError('Group conversion failed');
      }

      return this.createResult(convertedGroups.join(''));

    } catch (error) {
      throw new TransformError(
        `Groups conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async applyRule(
    content: string, 
    rule: ConversionRule
  ): Promise<string | null> {
    try {
      switch (rule.type) {
        case 'toKanji': {
          const kanjiResult = await this.kanjiConverter.execute({ text: content });
          return kanjiResult.content;
        }

        case 'toFullwidth': {
          const widthResult = await this.widthConverter.execute({ text: content });
          return widthResult.content;
        }

        default:
          throw new TransformError(`Unknown rule type: ${rule.type}`);
      }
    } catch {
      return null;
    }
  }

  toString(): string {
    return `ConvertGroupsStep(rules: ${this.rules.length})`;
  }
}