import { TypographyDOMOperator } from '../dom';
import { TransformExecutor } from '../transform/transform-executor';
import type { GeneratedPattern } from 'virtual:pattern-config';
import type { ProcessedRange } from '../transform/types';
import { ProcessorError, ValidationError } from '@/lib/errors';
import { createContextLogger } from '@/lib/logger';
import DOMPurify from 'dompurify';

const typographyLogger = createContextLogger('typography-processor');

interface ProcessingQueue {
  node: Node;
  parent: Node;
  patterns: GeneratedPattern[];
}

export class TypographyProcessor {
  private static instance: TypographyProcessor | null = null;
  private readonly patterns: GeneratedPattern[];
  private readonly executors: Map<string, TransformExecutor>;

  private constructor(
    patterns: GeneratedPattern[],
    private readonly domOperator: TypographyDOMOperator
  ) {
    this.patterns = this.sortPatterns(patterns);
    this.executors = new Map(
      this.patterns.map(pattern => [
        pattern.name,
        TransformExecutor.fromPattern(pattern)
      ])
    );
    typographyLogger.info('TypographyProcessor initialized', {
      patternCount: patterns.length
    });
  }

  static getInstance(
    patterns?: GeneratedPattern[],
    domOperator?: TypographyDOMOperator
  ): TypographyProcessor {
    typographyLogger.debug('getInstance called', {
      hasPatterns: !!patterns,
      patternsLength: patterns?.length ?? 0,
      hasDomOperator: !!domOperator
    });

    if (!this.instance) {
      if (!patterns) {
        typographyLogger.error('初期化エラー: パターンが未定義');
        throw new ProcessorError(
          'TypographyProcessor initialization failed: Patterns are required'
        );
      }
      if (!domOperator) {
        typographyLogger.error('初期化エラー: DOMOperatorが未定義');
        throw new ProcessorError(
          'TypographyProcessor initialization failed: DOMOperator is required'
        );
      }
      
      try {
        this.instance = new TypographyProcessor(patterns, domOperator);
        typographyLogger.info('TypographyProcessor 初期化成功', {
          patternsCount: patterns.length
        });
      } catch (error) {
        typographyLogger.error('初期化エラー: インスタンス生成失敗', {
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : 'Unknown error'
        });
        throw new ProcessorError(
          `TypographyProcessor initialization failed: ${
            error instanceof Error ? error.message : '不明なエラー'
          }`
        );
      }
    }

    return this.instance;
  }

  /**
   * HTMLコンテンツの処理
   */
  public async process(html: string): Promise<DocumentFragment> {
    if (!html) {
      throw new ValidationError('HTML content is empty');
    }

    typographyLogger.info('Starting content processing', {
      contentLength: html.length
    });

    try {
      // サニタイズ処理
      const cleanHtml = this.sanitizeContent(html);
      
      // template要素を使用してパース
      const template = document.createElement('template');
      template.innerHTML = cleanHtml;
      const fragment = document.createDocumentFragment();

      // 処理キューの初期化
      const queue: ProcessingQueue[] = Array.from(template.content.childNodes).map(node => ({
        node,
        parent: fragment,
        patterns: this.patterns
      }));

      // コンテンツの処理
      while (queue.length > 0) {
        const current = queue.shift();
        if (!current) break;

        await this.processQueueItem(current, queue);
      }

      typographyLogger.info('Content processing completed', {
        fragmentChildCount: fragment.childNodes.length
      });

      return fragment;

    } catch (error) {
      typographyLogger.error('Content processing failed', error);
      throw new ProcessorError(
        `処理に失敗: ${error instanceof Error ? error.message : '不明なエラー'}`
      );
    }
  }

  /**
   * キューアイテムの処理
   */
  private async processQueueItem(
    item: ProcessingQueue,
    queue: ProcessingQueue[]
  ): Promise<void> {
    const { node, parent, patterns } = item;

    try {
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        // テキストノードの処理
        const processed = await this.processTextContent(
          node.textContent,
          patterns
        );
        processed.forEach(n => parent.appendChild(n));

      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // 要素ノードの処理
        const element = node.cloneNode(false) as Element;
        parent.appendChild(element);

        // 子ノードをキューに追加
        Array.from(node.childNodes).forEach(child => {
          queue.push({
            node: child,
            parent: element,
            patterns
          });
        });
      }
    } catch (error) {
      typographyLogger.error('Queue item processing failed', {
        nodeType: node.nodeType,
        error
      });
      throw error;
    }
  }

  /**
   * テキストコンテンツの処理
   */
  private async processTextContent(
    text: string,
    patterns: GeneratedPattern[]
  ): Promise<Node[]> {
    const nodes: Node[] = [];
    const ranges = new Set<ProcessedRange>();
    let currentPosition = 0;

    while (currentPosition < text.length) {
      // 処理済み範囲のスキップ
      const skipTo = this.findNextUnprocessedPosition(currentPosition, ranges);
      if (skipTo > currentPosition) {
        // スキップした範囲のテキストをそのまま追加
        const skipped = text.substring(currentPosition, skipTo);
        nodes.push(this.domOperator.createTextNode(skipped));
        currentPosition = skipTo;
        continue;
      }

      // パターンマッチングと処理
      let matched = false;
      for (const pattern of patterns) {
        if (this.shouldSkipPattern(pattern, currentPosition, text, ranges)) {
          continue;
        }

        const executor = this.executors.get(pattern.name);
        if (!executor) continue;

        const result = await this.tryProcessPattern(
          pattern,
          executor,
          text,
          currentPosition
        );

        if (result) {
          const { nodes: patternNodes, length } = result;
          patternNodes.forEach(node => nodes.push(node));

          ranges.add({
            start: currentPosition,
            end: currentPosition + length,
            pattern: pattern.name
          });
          currentPosition += length;
          matched = true;
          break;
        }
      }

      // マッチしなかった場合は1文字進める
      if (!matched) {
        const char = text.charAt(currentPosition);
        nodes.push(this.domOperator.createTextNode(char));
        currentPosition++;
      }
    }

    return nodes;
  }

  /**
   * パターン処理の試行
   */
  private async tryProcessPattern(
    pattern: GeneratedPattern,
    executor: TransformExecutor,
    text: string,
    position: number
  ): Promise<{ nodes: Node[]; length: number } | null> {
    try {
      // パターンのコンパイルと実行
      const regexp = new RegExp(pattern.pattern.source, pattern.pattern.flags);
      regexp.lastIndex = position;
      
      const match = regexp.exec(text);
      if (!match || match.index !== position) return null;

      // 先読み・後読みの確認
      if (pattern.pattern.lookbehind || pattern.pattern.lookahead) {
        const fullPattern = this.buildFullPattern(pattern);
        const fullRegexp = new RegExp(fullPattern, pattern.pattern.flags);
        fullRegexp.lastIndex = position;
        
        const fullMatch = fullRegexp.exec(text);
        if (!fullMatch || fullMatch.index !== position) return null;
      }

      // 変換の実行
      const result = await executor.execute({
        text: match[0],
        match,
        processedRanges: []
      });

      // ノードの生成
      const nodes: Node[] = [];

      // 前方スペース（必要な場合）
      if (pattern.transform.ensureSpace?.before) {
        nodes.push(this.domOperator.createTextNode('　'));
      }

      // 変換結果からノードを生成
      if (result.type === 'tcy') {
        // tcyの場合はspan要素を生成
        nodes.push(this.domOperator.createTcyElement(result.content));
      } else {
        // 通常テキストの場合
        nodes.push(this.domOperator.createTextNode(result.content));
      }

      // 後方スペース（必要な場合）
      if (pattern.transform.ensureSpace?.after) {
        nodes.push(this.domOperator.createTextNode('　'));
      }

      return {
        nodes,
        length: match[0].length
      };

    } catch (error) {
      typographyLogger.warn('Pattern processing failed', {
        pattern: pattern.name,
        error
      });
      return null;
    }
  }

  /**
   * サニタイズ処理
   */
  private sanitizeContent(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'ruby', 'rt', 'rp', 'br', 'h1'],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      // HTML形式を保持するための設定
      PARSER_MEDIA_TYPE: 'text/html'
    });
  }

  /**
   * パターンの優先順位によるソート
   */
  private sortPatterns(patterns: GeneratedPattern[]): GeneratedPattern[] {
    return [...patterns].sort((a, b) => {
      const priorityA = a.priority ?? 0;
      const priorityB = b.priority ?? 0;
      return priorityA - priorityB;  // 昇順
    });
  }

  /**
   * 次の未処理位置の検索
   */
  private findNextUnprocessedPosition(
    position: number,
    ranges: Set<ProcessedRange>
  ): number {
    let nextPosition = position;
    for (const range of ranges) {
      if (position >= range.start && position < range.end) {
        nextPosition = Math.max(nextPosition, range.end);
      }
    }
    return nextPosition;
  }

  /**
   * パターンのスキップ判定
   */
  private shouldSkipPattern(
    pattern: GeneratedPattern,
    position: number,
    text: string,
    ranges: Set<ProcessedRange>
  ): boolean {
    // 処理済み範囲との重複チェック
    for (const range of ranges) {
      if (position >= range.start && position < range.end) {
        return true;
      }
    }

    // 先読み・後読みパターンの場合の位置チェック
    if (pattern.pattern.lookbehind && position === 0) return true;
    if (pattern.pattern.lookahead && position === text.length - 1) return true;

    return false;
  }

  /**
   * 完全なパターンの構築（先読み・後読みを含む）
   */
  private buildFullPattern(pattern: GeneratedPattern): string {
    const { source, lookbehind, lookahead } = pattern.pattern;
    return `${lookbehind || ''}${source}${lookahead || ''}`;
  }
}