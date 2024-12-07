import { DOMOperator } from '../core/dom-operator';
import { ConversionPattern } from '../core/conversion-pattern';
import { NovelDownloaderError, ValidationError } from '@/types';
import { TransformProcessor } from './transform-processor';
import { TEXT_PROCESSING_CONFIG } from '@/config/constants';
import { TransformConfig } from '../types';

export class PatternManager {
  private patterns: Map<string, PatternEntry>;
  private transformProcessor: TransformProcessor;
  private sortedPatternsCache: ConversionPattern[] | null;
  private iterationCount: number;

  constructor(domOperator: DOMOperator) {
    if (!domOperator) {
      throw new NovelDownloaderError('DOMOperator is required');
    }
    this.patterns = new Map();
    this.transformProcessor = new TransformProcessor(domOperator);
    this.sortedPatternsCache = null;
    this.iterationCount = 0;
  }

  registerPattern(
    patternDef: PatternDefinition,
    basePriority: number,
    orderIndex: number
  ): void {
    try {
      if (!patternDef.name || !patternDef.pattern || !patternDef.transform) {
        throw new ValidationError('Invalid pattern definition');
      }

      const regex = this.createRegExp(patternDef);
      const priority = this.calculatePriority(basePriority, orderIndex);

      const pattern = new ConversionPattern({
        name: patternDef.name,
        priority,
        pattern: regex,
        process: (match: RegExpExecArray, reprocess?: (text: string) => Node[]) => {
          // パターンの適用回数をチェック
          if (this.iterationCount >= TEXT_PROCESSING_CONFIG.MAX_PATTERN_ITERATIONS) {
            throw new NovelDownloaderError('Maximum pattern iterations exceeded');
          }
          this.iterationCount++;
          return this.transformProcessor.processTransform(match, patternDef.transform, reprocess);
        },
        description: patternDef.description,
        disabled: patternDef.disabled
      });

      this.patterns.set(patternDef.name, { pattern, priority });
      this.invalidateCache();

    } catch (error) {
      throw new NovelDownloaderError(
        `Failed to register pattern ${patternDef.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  unregisterPattern(patternName: string): void {
    this.patterns.delete(patternName);
    this.invalidateCache();
  }

  getPattern(patternName: string): ConversionPattern | null {
    const entry = this.patterns.get(patternName);
    return entry ? entry.pattern : null;
  }

  getAllPatterns(): ConversionPattern[] {
    if (!this.sortedPatternsCache) {
      this.sortedPatternsCache = Array.from(this.patterns.values())
        .map(entry => entry.pattern)
        .filter(pattern => pattern.isEnabled())
        .sort((a, b) => b.priority - a.priority);  // 優先度の高い順にソート
    }
    return this.sortedPatternsCache;
  }

  clearPatterns(): void {
    this.patterns.clear();
    this.invalidateCache();
    this.iterationCount = 0;
  }

  setPatternEnabled(patternName: string, enabled: boolean): void {
    const entry = this.patterns.get(patternName);
    if (entry) {
      entry.pattern.setEnabled(enabled);
      this.invalidateCache();
    }
  }

  resetIterationCount(): void {
    this.iterationCount = 0;
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
      throw new ValidationError(
        `Invalid regular expression: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private calculatePriority(basePriority: number, orderIndex: number): number {
    return basePriority + (orderIndex * 0.1);
  }

  private invalidateCache(): void {
    this.sortedPatternsCache = null;
  }

  getPatternCount(): number {
    return this.patterns.size;
  }

  hasPattern(patternName: string): boolean {
    return this.patterns.has(patternName);
  }
}

interface PatternEntry {
  pattern: ConversionPattern;
  priority: number;
}

interface PatternDefinition {
  name: string;
  description?: string;
  pattern: {
    source: string;
    flags?: string;
    lookbehind?: string;
    lookahead?: string;
  };
  transform: TransformConfig;
  disabled?: boolean;
}
