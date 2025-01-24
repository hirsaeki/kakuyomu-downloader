import { createContextLogger } from '@/lib/logger';

const emphasisLogger = createContextLogger('emphasis-processor');

/**
 * XHTML傍点タグと独自記法を相互に変換するプロセッサー
 */
export class EmphasisProcessor {
  /**
   * XHTML傍点タグを独自記法に変換する
   * @param html XHTML傍点タグを含むテキスト
   * @returns 独自記法に変換されたテキスト
   */
  toEmphasisNotation(html: string): string {
    emphasisLogger.debug('XHTMLから独自記法への変換を開始', {
      textLength: html.length
    });

    // 傍点を持つ文字列を抽出して変換
    const result = html.replace(
      /<em class="emphasisDots">(?:<span>([^<]+)<\/span>)+<\/em>/g,
      (match) => {
        // span内の文字を抽出して結合
        const text = match.match(/<span>([^<]+)<\/span>/g)
          ?.map(span => span.replace(/<\/?span>/g, ''))
          .join('');
        return `《《${text}》》`;
      }
    );

    emphasisLogger.debug('独自記法への変換が完了', {
      processedLength: result.length,
      sampleText: result.slice(0, 100)
    });

    return result;
  }

  /**
   * 独自記法をXHTML傍点タグに変換する
   * @param text 独自記法を含むテキスト
   * @returns XHTML傍点タグに変換されたテキスト
   */
  fromEmphasisNotation(text: string): string {
    emphasisLogger.debug('独自記法からXHTMLへの変換を開始', {
      textLength: text.length
    });

    const result = text.replace(
      /《《([^》]+?)》》/g,
      (_, text) => {
        const spans = text.split('').map((char: string) => `<span>${char}</span>`).join('');
        return `<em class="emphasisDots">${spans}</em>`;
      }
    );

    emphasisLogger.debug('XHTMLへの変換が完了', {
      processedLength: result.length,
      sampleText: result.slice(0, 100)
    });

    return result;
  }

  /**
   * クラスメソッドとしてのtoEmphasisNotation
   * @param html XHTML傍点タグを含むテキスト
   * @returns 独自記法に変換されたテキスト
   */
  static toEmphasisNotation(html: string): string {
    const processor = new EmphasisProcessor();
    return processor.toEmphasisNotation(html);
  }

  /**
   * クラスメソッドとしてのfromEmphasisNotation
   * @param text 独自記法を含むテキスト
   * @returns XHTML傍点タグに変換されたテキスト
   */
  static fromEmphasisNotation(text: string): string {
    const processor = new EmphasisProcessor();
    return processor.fromEmphasisNotation(text);
  }
}