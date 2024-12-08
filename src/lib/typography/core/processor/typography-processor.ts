import { TypographyDOMOperator } from '../dom';
import { TransformExecutor } from '../transform/transform-executor';
import type { GeneratedPattern } from '../config/generated/patterns';
import type { ProcessedRange } from '../transform/base/types';
import { NovelDownloaderError, ValidationError } from '@/types';
import { TEXT_PROCESSING_CONFIG } from '@/config/constants';
import DOMPurify from 'dompurify';
import { createContextLogger } from '@/lib/logger';

const typographyLogger = createContextLogger('TypographyProcessor');

/**
 * 組版処理の中核を担うプロセッサー
 * テキストの変換とDOM操作を統合的に管理
 */
export class TypographyProcessor {
  private static instance: TypographyProcessor | null = null;
  private transformExecutors: Map<string, TransformExecutor> = new Map();

  private constructor(
    private patterns: GeneratedPattern[],
    private domOperator: TypographyDOMOperator
  ) {
    if (!patterns || !domOperator) {
      throw new NovelDownloaderError('Patterns and DOMOperator are required');
    }
    this.initializeExecutors();
  }

  /**
   * シングルトンインスタンスの取得
   */
  static getInstance(patterns?: GeneratedPattern[], domOperator?: TypographyDOMOperator): TypographyProcessor {
    if (!TypographyProcessor.instance && patterns && domOperator) {
      TypographyProcessor.instance = new TypographyProcessor(patterns, domOperator);
    }
    if (!TypographyProcessor.instance) {
      throw new NovelDownloaderError('TypographyProcessor is not initialized');
    }
    return TypographyProcessor.instance;
  }

  /**
   * HTMLをXHTML形式に変換
   */
  public async convertToXhtml(html: string, title: string = 'Chapter'): Promise<string> {
    if (!html) {
      throw new ValidationError('HTML content is empty');
    }

    try {
      // HTML sanitization
      const cleanHtml = DOMPurify.sanitize(html, TEXT_PROCESSING_CONFIG.SANITIZER_CONFIG);
      const doc = this.createDocument(title);
      const contentDoc = new DOMParser().parseFromString(cleanHtml, 'text/html');

      // Process content
      await this.processNode(contentDoc.body);

      // Move processed content
      this.moveContent(contentDoc.body, doc.body);

      // Serialize to XHTML
      const serialized = new XMLSerializer().serializeToString(doc);
      const result = this.formatXhtml(serialized);

      if (doc.getElementsByTagName('parsererror').length > 0) {
        throw new NovelDownloaderError('Invalid XHTML generated');
      }

      return result;

    } catch (error) {
      if (error instanceof ValidationError || error instanceof NovelDownloaderError) {
        throw error;
      }
      throw new NovelDownloaderError(
        `XHTML conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 各パターンに対応するExecutorを初期化
   */
  private initializeExecutors(): void {
    this.patterns.forEach(pattern => {
      try {
        const executor = TransformExecutor.fromPattern(pattern);
        this.transformExecutors.set(pattern.name, executor);
      } catch (error) {
        typographyLogger.error(`Failed to initialize executor for pattern ${pattern.name}:`, error);
      }
    });

    if (this.transformExecutors.size === 0) {
      typographyLogger.warn('No transform executors initialized');
    }
  }

  /**
   * DOMノードを処理
   */
  private async processNode(node: Node): Promise<void> {
    if (node.nodeType === Node.TEXT_NODE && node.textContent) {
      await this.processTextContent(node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      if (element.tagName.toLowerCase() === 'p') {
        this.ensureLeadingSpace(element);
      }
      for (const child of Array.from(element.childNodes)) {
        await this.processNode(child);
      }
    }
  }

  /**
   * テキストコンテンツを処理
   */
  private async processTextContent(node: Node): Promise<void> {
    if (!node.textContent || !node.parentNode) return;

    const text = node.textContent;
    let currentPosition = 0;
    const processedRanges: ProcessedRange[] = [];
    const fragments: Node[] = [];
    let lastProcessedPosition = 0;

    while (currentPosition < text.length) {
      // 重複範囲のチェック
      const overlappingRange = this.findOverlappingRange(currentPosition, processedRanges);
      if (overlappingRange) {
        // 未処理部分があれば通常のテキストとして追加
        if (lastProcessedPosition < overlappingRange.start) {
          fragments.push(
            this.domOperator.createTextNode(
              text.substring(lastProcessedPosition, overlappingRange.start)
            )
          );
        }
        currentPosition = overlappingRange.end;
        lastProcessedPosition = currentPosition;
        continue;
      }

      // パターンマッチングと変換処理
      let processed = false;
      for (const [patternName, executor] of this.transformExecutors.entries()) {
        try {
          const result = await executor.execute({
            text: text.slice(currentPosition),
            processedRanges
          });

          if (result) {
            // 未処理部分があれば通常のテキストとして追加
            if (currentPosition > lastProcessedPosition) {
              fragments.push(
                this.domOperator.createTextNode(
                  text.substring(lastProcessedPosition, currentPosition)
                )
              );
            }

            // 変換結果を追加
            if (result.type === 'text') {
              fragments.push(this.domOperator.createTextNode(result.content));
            } else {
              fragments.push(this.domOperator.createTcyElement(result.content));
            }

            // 処理範囲を記録
            const matchLength = result.content.length;
            processedRanges.push({
              start: currentPosition,
              end: currentPosition + matchLength,
              pattern: patternName
            });

            currentPosition += matchLength;
            lastProcessedPosition = currentPosition;
            processed = true;
            break;
          }
        } catch (error) {
          typographyLogger.error(`Pattern ${patternName} processing failed:`, error);
        }
      }

      if (!processed) {
        currentPosition++;
      }
    }

    // 残りの未処理部分を追加
    if (lastProcessedPosition < text.length) {
      fragments.push(
        this.domOperator.createTextNode(
          text.substring(lastProcessedPosition)
        )
      );
    }

    // 結果をDOMに反映
    if (fragments.length > 0) {
      fragments.forEach(fragment => {
        node.parentNode!.insertBefore(fragment, node);
      });
      node.parentNode.removeChild(node);
    }
  }

  /**
   * 段落の先頭スペースを確保
   */
  private ensureLeadingSpace(element: Element): void {
    const firstChild = element.firstChild;
    
    if (!firstChild) {
      element.textContent = '\u3000';
      return;
    }

    if (firstChild.nodeType === Node.TEXT_NODE && firstChild.textContent) {
      const text = firstChild.textContent;
      if (!/^[\s\u3000]/.test(text)) {
        firstChild.textContent = '\u3000' + text;
      }
    } else if (element.childNodes.length > 0) {
      const spaceNode = element.ownerDocument?.createTextNode('\u3000');
      if (spaceNode) {
        element.insertBefore(spaceNode, element.firstChild);
      }
    }
  }

  /**
   * 指定位置が処理済み範囲と重複しているかチェック
   */
  private findOverlappingRange(position: number, ranges: ProcessedRange[]): ProcessedRange | null {
    return ranges.find(range =>
      position >= range.start && position < range.end
    ) || null;
  }

  /**
   * XHTML文書を作成
   */
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

  /**
   * DOMコンテンツを移動
   */
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

  /**
   * XML特殊文字をエスケープ
   */
  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, char => ({
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '\'': '&apos;',
      '"': '&quot;'
    }[char] || char));
  }

  /**
   * XHTML形式に整形
   */
  private formatXhtml(serialized: string): string {
    const withoutXmlDecl = serialized.replace(/<\?xml[^>]*\?>/, '');
    return `<?xml version="1.0" encoding="UTF-8"?>${withoutXmlDecl}`;
  }
}