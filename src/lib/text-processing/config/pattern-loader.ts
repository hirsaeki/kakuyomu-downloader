import { 
  PatternDefinition,
  PatternConfig
} from './pattern-types';
import { ConversionPattern } from '../core/conversion-pattern';
import { DOMOperator } from '../core/dom-operator';
import { TransformProcessor } from './transform-processor';
import { TextProcessingError } from '../core/processing-error';

export class PatternLoader {
  private transformProcessor: TransformProcessor;

  constructor(private domOperator: DOMOperator) {
    this.transformProcessor = new TransformProcessor(domOperator);
  }

  loadPatterns(config: PatternConfig): ConversionPattern[] {
    if (!config.patterns || !Array.isArray(config.patterns)) {
      throw new TextProcessingError('Invalid pattern configuration');
    }
    return config.patterns.map(pattern => this.createPattern(pattern));
  }

  private createPattern(patternDef: PatternDefinition): ConversionPattern {
    try {
      const regex = this.createRegExp(patternDef);

      return new ConversionPattern({
        name: patternDef.name,
        priority: patternDef.priority,
        pattern: regex,
        process: (match: RegExpExecArray) => 
          this.transformProcessor.processTransform(
            patternDef.transform.type,
            patternDef.transform.steps,
            match
          ),
        description: patternDef.description
      });
    } catch (error) {
      throw new TextProcessingError(
        `Failed to create pattern ${patternDef.name}: ${error.message}`,
        { patternName: patternDef.name }
      );
    }
  }

  private createRegExp(pattern: PatternDefinition): RegExp {
    try {
      const { source, flags = 'g', lookbehind, lookahead } = pattern.pattern;
      const parts = [
        lookbehind || '',
        source,
        lookahead || ''
      ].filter(Boolean);

      return new RegExp(parts.join(''), flags);
    } catch (error) {
      throw new TextProcessingError(
        `Invalid regular expression in pattern ${pattern.name}: ${error.message}`,
        { patternName: pattern.name }
      );
    }
  }
}
