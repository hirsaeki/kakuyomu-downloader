import { TransformExecutor } from '../transform/transform-executor';
import type { GeneratedPattern } from 'virtual:pattern-config';
import { ProcessorError, ValidationError } from '@/lib/errors';
import { createContextLogger } from '@/lib/logger';
import DOMPurify from 'dompurify';

const typographyLogger = createContextLogger('typography-processor');

export class TypographyProcessor {
  private static instance: TypographyProcessor | null = null;
  private readonly patterns: GeneratedPattern[];
  private readonly executors: Map<string, TransformExecutor>;
  private readonly compiledPatterns: Map<string, RegExp>;  // 正規表現キャッシュ
  private readonly MAX_RECURSION_DEPTH = 10;

  private constructor(
    patterns: GeneratedPattern[],
  ) {
    this.patterns = this.sortPatterns(patterns);
    this.executors = new Map(
      this.patterns.map(pattern => [
        pattern.name,
        // テキスト処理のためのExecutorを生成
        TransformExecutor.fromPattern(pattern)
      ])
    );

    // パターンの正規表現を事前にコンパイル
    this.compiledPatterns = new Map();
    for (const pattern of this.patterns) {
      const regexp = this.buildFullPattern(pattern);
      this.compiledPatterns.set(pattern.name, regexp);
    }

    typographyLogger.debug('Initialized processor', {
      patternCount: patterns.length,
      compiledPatterns: this.compiledPatterns.size
    });
  }

  protected buildFullPattern(pattern: GeneratedPattern): RegExp {
    const { source, lookbehind, lookahead, flags = 'g'} = pattern.pattern;
    const fullPattern = `${lookbehind || ''}${source}${lookahead || ''}`;

    typographyLogger.debug('Building pattern', {
      pattern: pattern.name,
      source,
      flags,
      fullPattern
    });

    return new RegExp(fullPattern, flags);
  }

  static getInstance(
    patterns?: GeneratedPattern[],
  ): TypographyProcessor {
    typographyLogger.debug('Instance requested', {
      hasPatterns: !!patterns,
    });

    if (!this.instance) {
      if (!patterns) {
        typographyLogger.error('Initialization failed', {
          patterns: !!patterns,
        });
        throw new ProcessorError(
          'TypographyProcessor initialization failed: Required dependencies missing'
        );
      }

      this.instance = new TypographyProcessor(patterns);
    }

    return this.instance;
  }

  public async process(html: string, depth: number = 0): Promise<string> {
    if (depth >= this.MAX_RECURSION_DEPTH) {
      typographyLogger.error('Maximum recursion depth exceeded', {
        depth,
        maxDepth: this.MAX_RECURSION_DEPTH,
        contentLength: html.length,
        sampleContent: html.slice(0, 100)
      });
      throw new ProcessorError(
        `Typography processing exceeded maximum recursion depth (${this.MAX_RECURSION_DEPTH}). ` +
        'This might indicate a pattern definition issue.'
      );
    }

    if (!html) {
      throw new ValidationError('HTML content is empty');
    }

    typographyLogger.info('Starting content processing', { 
      contentLength: html.length,
      recursionDepth: depth
    });

    try {
      const cleanHtml = this.sanitizeContent(html);
      let result = cleanHtml;

      // 各パターンで処理
      for (const pattern of this.patterns) {
        typographyLogger.debug(`Processing pattern: ${pattern.name}`, {
          priority: pattern.priority,
          pattern: {
            source: pattern.pattern.source,
            flags: pattern.pattern.flags
          }
        });
        result = await this.processWithPattern(result, pattern);
      }

      typographyLogger.info('Processing completed', {
        patternCount: this.patterns.length
      });

      return result;

    } catch (error) {
      typographyLogger.error('Processing failed', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message
        } : 'Unknown error',
        recursionDepth: depth
      });
      throw error;
    }
  }

  private getOrCreateRegExp(pattern: GeneratedPattern): RegExp {
    const cached = this.compiledPatterns.get(pattern.name);
    if (cached) {
      return cached;
    }

    const regexp = this.buildFullPattern(pattern);
    this.compiledPatterns.set(pattern.name, regexp);
    return regexp;
  }

  private async processWithPattern(
    text: string,
    pattern: GeneratedPattern
  ): Promise<string> {
    const regexp = this.getOrCreateRegExp(pattern);
    const matches = [...text.replaceAll('\n', '\u000A').matchAll(regexp)];
    if (matches.length === 0) return text;

    typographyLogger.debug('Matches found', {
      pattern: pattern.name,
      matches: matches.length,
      sampleText: text.replaceAll('\n', '[LF]').substring(0, 100)
    });

    let lastIndex = 0;
    let processedText = '';

    for (const match of matches) {
      if(match.index! > lastIndex) {
        processedText += text.slice(lastIndex, match.index);
      }

      try {
        const executor = this.executors.get(pattern.name);
        if (!executor) continue;

        const transformed = await executor.execute({
          text: match[0],
          match
        }, pattern);

        processedText += transformed.textContent;

        typographyLogger.debug('Transform completed', {
          pattern: pattern.name,
          original: match[0],
          transformed: transformed.textContent,
        });

      } catch (error) {
        typographyLogger.warn('Transform failed', {
          pattern: pattern.name,
          text: match[0],
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        processedText += match[0];
      }

      lastIndex = match.index! + match[0].length;
    }

    if (lastIndex < text.length) {
      processedText += text.slice(lastIndex);
    }

    return processedText;
  }

  private sanitizeContent(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'ruby', 'rt', 'rp', 'br', 'h1'],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      PARSER_MEDIA_TYPE: 'text/html'
    });
  }

  private sortPatterns(patterns: GeneratedPattern[]): GeneratedPattern[] {
    typographyLogger.debug('Sorting patterns', {
      count: patterns.length
    });

    return [...patterns].sort((a, b) => {
      const priorityA = a.priority ?? a.basePriority ?? 0;
      const priorityB = b.priority ?? b.basePriority ?? 0;
      return priorityA - priorityB;  // 昇順（小さい数が優先）
    });
  }
}