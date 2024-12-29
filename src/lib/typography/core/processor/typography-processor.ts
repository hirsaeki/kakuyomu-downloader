import { TypographyDOMOperator } from '../dom';
import { TransformExecutor } from '../transform/transform-executor';
import type { GeneratedPattern } from 'virtual:pattern-config';
import { ProcessorError, ValidationError } from '@/lib/errors';
import { createContextLogger } from '@/lib/logger';
import DOMPurify from 'dompurify';
import sanitizeHtml from 'sanitize-html';

const typographyLogger = createContextLogger('typography-processor');

export class TypographyProcessor {
  private static instance: TypographyProcessor | null = null;
  private readonly patterns: GeneratedPattern[];
  private readonly executors: Map<string, TransformExecutor>;
  private readonly compiledPatterns: Map<string, RegExp>;  // 正規表現キャッシュ
  private readonly MAX_RECURSION_DEPTH = 10;

  private constructor(
    patterns: GeneratedPattern[],
    private readonly domOperator: TypographyDOMOperator
  ) {
    this.patterns = this.sortPatterns(patterns);
    this.executors = new Map(
      this.patterns.map(pattern => [
        pattern.name,
        // DocumentをTransformExecutorに渡す
        TransformExecutor.fromPattern(pattern, document)
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

  // buildFullPattern を private から protected に変更し、実装を修正
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
    domOperator?: TypographyDOMOperator
  ): TypographyProcessor {
    typographyLogger.debug('Instance requested', {
      hasPatterns: !!patterns,
      hasDomOperator: !!domOperator
    });

    if (!this.instance) {
      if (!patterns || !domOperator) {
        typographyLogger.error('Initialization failed', {
          patterns: !!patterns,
          domOperator: !!domOperator
        });
        throw new ProcessorError(
          'TypographyProcessor initialization failed: Required dependencies missing'
        );
      }

      this.instance = new TypographyProcessor(patterns, domOperator);
    }

    return this.instance;
  }

  public async process(html: string, depth: number = 0): Promise<DocumentFragment> {
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
      
      // templateタグとその内容の生成
      const template = this.domOperator.createTemplate();
      template.innerHTML = cleanHtml;
      
      // fragmentの取得と初期化
      const fragment = this.domOperator.createDocumentFragment();
      Array.from(template.content.childNodes).forEach(node => {
        this.domOperator.appendChild(fragment, this.domOperator.cloneNode(node, true));
      });

      // 各パターンで全体を処理
      for (const pattern of this.patterns) {
        typographyLogger.debug(`Processing pattern: ${pattern.name}`, {
          priority: pattern.priority,
          pattern: {
            source: pattern.pattern.source,
            flags: pattern.pattern.flags
          }
        });

        await this.processWithPattern(fragment, pattern, depth);
      }

      typographyLogger.info('Processing completed', {
        patternCount: this.patterns.length
      });

      // 最後の仕上げとしてマーカーを除去
      const cleanedHtml = this.sanitizeProcessedContent(
        new XMLSerializer().serializeToString(fragment)
      );
      
      const finalFragment = this.domOperator.createDocumentFragment();
      template.innerHTML = cleanedHtml;
      Array.from(template.content.childNodes).forEach(node => {
        this.domOperator.appendChild(finalFragment, this.domOperator.cloneNode(node, true));
      });

      return finalFragment;

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
    root: DocumentFragment,
    pattern: GeneratedPattern,
    currentDepth: number
  ): Promise<void> {
    const regexp = this.getOrCreateRegExp(pattern);

    const walker = this.domOperator.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (parent?.closest('[data-pattern]')) {
            return NodeFilter.FILTER_SKIP;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textNodes: Text[] = [];
    let node: Text | null;
    
    while (node = walker.nextNode() as Text) {
      textNodes.push(node);
    }

    for (const textNode of textNodes) {
      if (!textNode.textContent) continue;

      const matches = [...textNode.textContent.replaceAll('\n', '\u000A').matchAll(regexp)];
      if (matches.length === 0) continue;

      typographyLogger.debug('Matches found', {
        pattern: pattern.name,
        matches: matches.length,
        sampleText: textNode.textContent.replaceAll('\n', '[LF]').substring(0, 100)
      });

      await this.processMatches(textNode, matches, pattern, currentDepth);
    }
  }

  private async processMatches(
    node: Text,
    matches: RegExpMatchArray[],
    pattern: GeneratedPattern,
    currentDepth: number
  ): Promise<void> {
    const fragment = this.domOperator.createDocumentFragment();
    let lastIndex = 0;

    const reprocessFunction = async (text: string): Promise<Node[]> => {
      try {
        typographyLogger.debug('Starting group reprocessing', {
          textLength: text.length,
          currentDepth: currentDepth + 1,
          sampleText: text.slice(0, 50)
        });

        const processedFragment = await this.process(text, currentDepth + 1);
        return Array.from(processedFragment.childNodes);

      } catch (error) {
        if (error instanceof ProcessorError && error.message.includes('recursion depth')) {
          throw error;
        }

        typographyLogger.error('Group reprocessing failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          textLength: text.length,
          currentDepth: currentDepth + 1
        });
        
        const textNode = this.domOperator.createTextNode(text);
        return [textNode];
      }
    };

    for (const match of matches) {
      const startTime = Date.now();

      if (match.index! > lastIndex) {
        const textNode = this.domOperator.createTextNode(
          node.textContent!.slice(lastIndex, match.index)
        );
        this.domOperator.appendChild(fragment, textNode);
      }

      try {
        const executor = this.executors.get(pattern.name);
        if (!executor) continue;

        const transformedNode = await executor.execute({
          text: match[0],
          match,
          reprocess: reprocessFunction
        }, pattern);

        const span = this.domOperator.createElement('span');
        span.setAttribute('data-pattern', pattern.name);
        this.domOperator.appendChild(span, transformedNode);
        this.domOperator.appendChild(fragment, span);

        typographyLogger.debug('Transform completed', {
          pattern: pattern.name,
          original: match[0],
          transformed: transformedNode.textContent,
          executionTime: Date.now() - startTime
        });

      } catch (error) {
        typographyLogger.warn('Transform failed', {
          pattern: pattern.name,
          text: match[0],
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // エラー時は元のテキストを保持
        const errorNode = this.domOperator.createTextNode(match[0]);
        this.domOperator.appendChild(fragment, errorNode);
      }

      lastIndex = match.index! + match[0].length;
    }

    // 残りのテキストを保持
    if (lastIndex < node.textContent!.length) {
      const remainingText = this.domOperator.createTextNode(
        node.textContent!.slice(lastIndex)
      );
      this.domOperator.appendChild(fragment, remainingText);
    }

    if (node.parentNode) {
      this.domOperator.replaceChild(node.parentNode, fragment, node);
    }
  }

  private sanitizeContent(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'ruby', 'rt', 'rp', 'br', 'h1'],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      PARSER_MEDIA_TYPE: 'text/html'
    });
  }

  private sanitizeProcessedContent(html: string): string {
    return sanitizeHtml(html, {
      allowedTags: ['p', 'ruby', 'rt', 'rp', 'br', 'h1', 'span'],
      allowedAttributes: {
        '*': ['class', 'data-pattern']
      },
      transformTags: {
        'span': (tagName: string, attribs: sanitizeHtml.Attributes) => {
          // data-pattern属性を持つspanタグの場合は中身だけ残す
          if ('data-pattern' in attribs) {
            return {
              tagName: '',
              attribs: {}
            };
          }
          // それ以外のspanタグはそのまま
          return {
            tagName,
            attribs
          };
        }
      }
    });
  }

  private sortPatterns(patterns: GeneratedPattern[]): GeneratedPattern[] {
    typographyLogger.debug('Sorting patterns', {
      count: patterns.length
    });

    return [...patterns].sort((a, b) => {
      const priorityA = a.priority ?? 0;
      const priorityB = b.priority ?? 0;
      return priorityA - priorityB;  // 昇順（小さい数が優先）
    });
  }
}