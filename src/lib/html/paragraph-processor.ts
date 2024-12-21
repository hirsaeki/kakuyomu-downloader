import { createContextLogger } from '@/lib/logger';

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
  private readonly logger;

  constructor(options: ParagraphProcessorOptions = {}) {
    this.options = {
      minEmptyLines: 2,
      debug: false,
      ...options
    };

    this.logger = createContextLogger('ParagraphProcessor');
  }

  /**
   * テキストを段落処理して返す
   * @param text 処理対象のテキスト
   * @returns 段落処理されたテキスト
   */
  process(text: string): string {
    if (!text) {
      this.logger.debug('Empty text provided, returning as is');
      return text;
    }

    // テキストを行単位で分割
    const lines = text.split('\n');
    const processedLines: string[] = [];
    let currentParagraph: string[] = [];
    let emptyLineCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // 空行判定（スペースのみの行も空行とみなす）
      if (!trimmedLine) {
        emptyLineCount++;
      } else {
        // 空行でない場合
        // 段落区切り判定(空行の閾値越え)
        if (emptyLineCount >= this.options.minEmptyLines) {
          if (currentParagraph.length > 0) {
            // 現在の段落を<p>タグで囲んで追加
            processedLines.push(this.wrapParagraph(currentParagraph.join('\n')));
            currentParagraph = [];
          }
          emptyLineCount = 0;
          
        } else if (emptyLineCount === 1) {
            // 1行空行の場合は改行タグを追加
            currentParagraph.push('<br />');
            emptyLineCount = 0;
        }
        currentParagraph.push(line + '<br />');
      }
    }

    // 最後の段落の処理
    if (currentParagraph.length > 0) {
      processedLines.push(this.wrapParagraph(currentParagraph.join('\n')));
    }

    const result = processedLines.join('\n\n');

    if (this.options.debug) {
      this.logger.debug('Processed text:', {
        originalLength: text.length,
        processedLength: result.length,
        paragraphCount: processedLines.length
      });
    }

    return result;
  }

  /**
   * テキストを<p>タグで囲む
   */
  private wrapParagraph(text: string): string {
    return `<p>${text}</p>`;
  }
}

export { ParagraphProcessor, type ParagraphProcessorOptions };
