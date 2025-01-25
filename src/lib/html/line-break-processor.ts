import { createContextLogger } from "@/lib/logger";

const lineBreakLogger = createContextLogger("line-break-processor");

/**
 * 段落内の改行コードを<br />タグに変換するプロセッサー
 */
export class LineBreakProcessor {
  /**
   * DOM要素内の改行コードを<br/>タグに変換する
   * @param element 処理対象のDOM要素
   */
  insertLineBreaks(element: HTMLElement): void {
    lineBreakLogger.debug('改行処理を開始', { elementId: element.id });

    try {
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node: Text | null;
      while (node = walker.nextNode() as Text) {
        const text = node.textContent || '';
        const lines = text.split('\n');

        if (lines.length > 1) {
          lineBreakLogger.debug('改行を含むテキストノードを検出', {
            text: text.substring(0, 50),
            linesCount: lines.length
          });

          lines.forEach((line, index) => {
            node.before(document.createTextNode(line));
            if (index < lines.length - 1) {
              node.before(document.createElement('br'));
            }
          });
          node.remove();
        }
      }

      lineBreakLogger.debug('改行処理が完了');

    } catch (error) {
      lineBreakLogger.error('改行処理でエラーが発生', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      });
      // DOM操作の失敗は上位で処理する
      throw error;
    }
  }
}