import { DOMOperator } from './core/dom-operator';
import { PatternManager } from './config/pattern-manager';
import { ProcessingContext, ProcessedRange } from './types';
import { NovelDownloaderError, ValidationError } from '@/types';
import { ConversionPattern } from './core/conversion-pattern';
import { TEXT_PROCESSING_CONFIG } from '@/config/constants';
import DOMPurify from 'dompurify';
import { createContextLogger } from '@/lib/logger';

const textLogger = createContextLogger('TextProcessor');

export class TextProcessor {
  private patternManager: PatternManager;
  private processingContexts: WeakMap<Node, ProcessingContext>;
  private static instance: TextProcessor | null = null;

  private constructor(private domOperator: DOMOperator) {
    if (!domOperator) {
      throw new NovelDownloaderError('DOMOperatorが必要です');
    }
    this.patternManager = new PatternManager(domOperator);
    this.processingContexts = new WeakMap();
  }

  static getInstance(domOperator?: DOMOperator): TextProcessor {
    if (!TextProcessor.instance && domOperator) {
      TextProcessor.instance = new TextProcessor(domOperator);
    }
    if (!TextProcessor.instance) {
      throw new NovelDownloaderError('TextProcessorが初期化されていません');
    }
    return TextProcessor.instance;
  }

  public convertToXhtml(html: string, title: string = 'Chapter'): string {
    if (!html) {
      throw new ValidationError('HTMLコンテンツが空です');
    }

    try {
      // DOMPurifyの設定を明示的に行う
      const cleanHtml = DOMPurify.sanitize(html, TEXT_PROCESSING_CONFIG.SANITIZER_CONFIG);
      const doc = this.createDocument(title);
      const contentDoc = new DOMParser().parseFromString(cleanHtml, 'text/html');

      // 処理コンテキストの初期化
      this.processingContexts = new WeakMap();
      this.processNode(contentDoc.body, this.createInitialContext());

      // コンテンツの移動
      this.moveContent(contentDoc.body, doc.body);

      // XML宣言を追加し、適切なXHTML形式に変換
      const serialized = new XMLSerializer().serializeToString(doc);
      const result = this.formatXhtml(serialized);

      if (doc.getElementsByTagName('parsererror').length > 0) {
        throw new NovelDownloaderError('不正なXHTMLが生成されました');
      }

      return result;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NovelDownloaderError) {
        throw error;
      }
      throw new NovelDownloaderError(
        `XHTML変換に失敗: ${error instanceof Error ? error.message : '不明なエラー'}`
      );
    }
  }

  private createDocument(title: string): Document {
    const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ja">
  <head>
    <title>${this.escapeXml(title)}</title>
    <meta charset="UTF-8" />
    <link rel="stylesheet" type="text/css" href="style.css" />
  </head>
  <body></body>
</html>`;

    return new DOMParser().parseFromString(xhtml, 'application/xhtml+xml');
  }

  private processNode(node: Node, context: ProcessingContext): void {
    this.validateProcessingContext(context);

    if (this.processingContexts.has(node)) {
      const existingContext = this.processingContexts.get(node);
      if (existingContext && existingContext.depth >= context.depth) {
        return;
      }
    }

    this.processingContexts.set(node, context);

    if (node.nodeType === Node.TEXT_NODE && node.textContent) {
      this.processTextContent(node, context);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      this.processElementNode(node as Element, context);
    }
  }

  private processTextContent(node: Node, context: ProcessingContext): void {
    if (!node.textContent || !node.parentNode) return;

    const fragments = this.processText(node.textContent, context);

    if (fragments.length === 1 && fragments[0]?.nodeType === Node.TEXT_NODE) {
      // Optional chainingを使用
      const content = fragments[0]?.textContent ?? '';
      node.textContent = content;
    } else {
      fragments.forEach(fragment => {
        if (node.parentNode) {  // 明示的なnullチェック
          node.parentNode.insertBefore(fragment, node);
        }
      });
      if (node.parentNode) {  // 明示的なnullチェック
        node.parentNode.removeChild(node);
      }
    }
  }

  private processElementNode(element: Element, context: ProcessingContext): void {
    // 段落の処理
    if (element.tagName.toLowerCase() === 'p') {
      this.ensureLeadingSpace(element);
    }

    Array.from(element.childNodes).forEach(child => {
      this.processNode(child, {
        ...context,
        depth: context.depth + 1
      });
    });
  }

  private ensureLeadingSpace(element: Element): void {
    const firstChild = element.firstChild;

    if (!firstChild) {
      // 空の段落の場合は全角スペースを追加
      element.textContent = '\u3000';
      return;
    }

    if (firstChild.nodeType === Node.TEXT_NODE && firstChild.textContent) {
      const text = firstChild.textContent;
      const spacePattern = new RegExp('^[\\s\u3000]');
      if (!spacePattern.test(text)) {
        firstChild.textContent = '\u3000' + text;
      }
    } else if (element.childNodes.length > 0) {
      // テキストノード以外の要素が最初にある場合
      const spaceNode = element.ownerDocument?.createTextNode('\u3000');
      if (spaceNode) {
        element.insertBefore(spaceNode, element.firstChild);
      }
    }
  }

  private processText(text: string, context: ProcessingContext): Node[] {
    let currentPosition = 0;
    let lastIndex = 0;
    let iterations = 0;
    const fragments: Node[] = [];

    while (currentPosition < text.length &&
      iterations < TEXT_PROCESSING_CONFIG.MAX_PATTERN_ITERATIONS) {
      iterations++;
      this.validateProcessingContext(context);

      const overlappingRange = this.findOverlappingRange(currentPosition, context.processedRanges);
      if (overlappingRange) {
        if (lastIndex < overlappingRange.start) {
          fragments.push(this.domOperator.createTextNode(
            text.substring(lastIndex, overlappingRange.start)
          ));
        }
        currentPosition = overlappingRange.end;
        lastIndex = currentPosition;
        continue;
      }

      const patterns = this.patternManager.getAllPatterns();
      let matched = false;

      for (const pattern of patterns) {
        const match = this.tryPattern(pattern, text, currentPosition);
        if (match) {
          matched = true;
          fragments.push(...this.handleMatch(match, pattern, text, context, lastIndex));
          currentPosition = match.index + match[0].length;
          lastIndex = currentPosition;
          break;
        }
      }

      if (!matched) {
        currentPosition++;
      }
    }

    if (lastIndex < text.length) {
      fragments.push(this.domOperator.createTextNode(
        text.substring(lastIndex)
      ));
    }

    return fragments;
  }

  private tryPattern(pattern: ConversionPattern, text: string, position: number): RegExpExecArray | null {
    pattern.pattern.lastIndex = position;
    try {
      const match = pattern.pattern.exec(text);
      return match && match.index === position ? match : null;
    } catch (error) {
      // console.warn(`パターン実行エラー: ${pattern.name}`, error);
      textLogger.warn(`パターン実行エラー: ${pattern.name}`, error);
      return null;
    }
  }

  private handleMatch(
    match: RegExpExecArray,
    pattern: ConversionPattern,
    text: string,
    context: ProcessingContext,
    lastIndex: number
  ): Node[] {
    const fragments: Node[] = [];

    if (match.index > lastIndex) {
      fragments.push(this.domOperator.createTextNode(
        text.substring(lastIndex, match.index)
      ));
    }

    try {
      const matchRange: ProcessedRange = {
        start: match.index,
        end: match.index + match[0].length,
        pattern: pattern.name
      };

      const childContext: ProcessingContext = {
        ...context,
        depth: context.depth + 1,
        processingChain: [...context.processingChain, pattern.name],
        processedRanges: [...context.processedRanges, matchRange]
      };

      const processed = pattern.process(match,
        (text: string) => this.processText(text, childContext)
      );

      if (processed) {  // nullチェックを追加
        if (processed instanceof DocumentFragment) {
          Array.from(processed.childNodes).forEach(node => fragments.push(node));
        } else if (Array.isArray(processed)) {
          processed.forEach(node => fragments.push(node));
        } else {
          fragments.push(processed);
        }
        context.processedRanges.push(matchRange);
      }

    } catch (error) {
      hookLogger.error(`パターン ${pattern.name} の処理エラー:`, error);
      fragments.push(this.domOperator.createTextNode(match[0]));
    }

    return fragments;
  }

  private validateProcessingContext(context: ProcessingContext): void {
    const now = Date.now();
    if (now - context.startTime > TEXT_PROCESSING_CONFIG.TIMEOUTS.PATTERN) {
      throw new NovelDownloaderError('処理がタイムアウトしました');
    }

    if (context.depth > TEXT_PROCESSING_CONFIG.MAX_RECURSION_DEPTH) {
      throw new NovelDownloaderError('再帰の深さが最大値を超えました');
    }
  }

  private createInitialContext(): ProcessingContext {
    return {
      depth: 0,
      startTime: Date.now(),
      processingChain: [],
      processedRanges: []
    };
  }

  private findOverlappingRange(position: number, ranges: ProcessedRange[]): ProcessedRange | null {
    return ranges.find(range =>
      position >= range.start && position < range.end
    ) || null;
  }

  private moveContent(source: Node, target: Node): void {
    const ownerDocument = target.ownerDocument;
    if (!ownerDocument) {
      throw new NovelDownloaderError('Target node has no ownerDocument');
    }

    Array.from(source.childNodes).forEach(node => {
      const importedNode = ownerDocument.importNode(node, true);
      target.appendChild(importedNode);
    });
  }

  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, char => ({
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '\'': '&apos;',
      '"': '&quot;'
    }[char] || char));
  }

  private formatXhtml(serialized: string): string {
    // XML宣言が既に存在する場合は除去（新しいものと置換するため）
    const withoutXmlDecl = serialized.replace(/<\?xml[^>]*\?>/, '');

    // 新しいXML宣言を追加
    return `<?xml version="1.0" encoding="UTF-8"?>${withoutXmlDecl}`;
  }
}
