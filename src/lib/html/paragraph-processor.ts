import { createContextLogger } from "@/lib/logger";

const paragraphLogger = createContextLogger("paragraph-processor");

interface ParagraphProcessorOptions {
  /** 段落区切りと看做す最小の空行数（デフォルト: 2） */
  minEmptyLines?: number;
  /** デバッグログを有効にするかどうか */
  debug?: boolean;
}

/**
 * テキストの段落処理を行うユーティリティクラス
 */
class ParagraphProcessor {
  private readonly options: Required<ParagraphProcessorOptions>;

  constructor(options: ParagraphProcessorOptions = {}) {
    this.options = {
      minEmptyLines: 2,
      debug: false,
      ...options,
    };
  }

  /**
   * HTMLからテキストコンテンツを抽出する
   * @param html HTMLテキスト
   * @returns 純粋なテキストコンテンツ
   */
  private extractTextContent(html: string): string {
    if (!html) return html;

    // ブラウザ提供のDOMParserを使用
    const doc = new DOMParser().parseFromString(html, 'text/html');
    // textContentで純粋なテキストを取得（改行やスペースは保持される）
    return doc.body.textContent || '';
  }

  /**
   * テキストを段落処理して返す
   * @param html 処理対象のHTMLテキスト
   * @returns 段落処理されたテキスト
   */
  process(html: string): string {
    if (!html) {
      paragraphLogger.debug("Empty text provided, returning as is");
      return html;
    }

    // まずHTMLから純粋なテキストを抽出
    const plainText = this.extractTextContent(html);

    // テキストを行単位で分割
    const lines = plainText.split(/\r?\n/);
    const processedLines: string[] = [];
    let currentParagraph: string[] = [];
    let emptyLineCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 空行判定（スペースのみの行も空行とみなす）
      if (!line) {
        emptyLineCount++;
        continue;
      }

      // 段落区切り判定(空行の閾値越え)
      if (emptyLineCount >= this.options.minEmptyLines && currentParagraph.length > 0) {
        processedLines.push(this.wrapParagraph(currentParagraph.join('\n')));
        currentParagraph = [];
      }

      currentParagraph.push(line);
      emptyLineCount = 0;
    }

    // 最後の段落の処理
    if (currentParagraph.length > 0) {
      processedLines.push(this.wrapParagraph(currentParagraph.join('\n')));
    }

    // 段落間に改行を入れて結合（後続のLineBreakProcessorで<br />に変換される）
    const result = processedLines.join('\n\n');

    if (this.options.debug) {
      paragraphLogger.debug("Processed text:", {
        originalLength: html.length,
        processedLength: result.length,
        paragraphCount: processedLines.length,
      });
    }

    return result;
  }

  /**
   * テキストを<p>タグで囲む
   * 段落の前後には意図的に改行を入れない（段落間の改行はjoin時に挿入）
   */
  private wrapParagraph(text: string): string {
    return `<p>${text}</p>`;
  }
}

export { ParagraphProcessor, type ParagraphProcessorOptions };