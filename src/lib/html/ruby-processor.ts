import { createContextLogger } from '@/lib/logger';

const rubyLogger = createContextLogger('ruby-processor');

/**
 * XHTMLルビタグと青空文庫形式のルビ記法を相互に変換するプロセッサー
 */
export class RubyProcessor {
  /**
   * 青空文庫形式のルビ記法をXHTMLルビタグに変換する
   * @param text 青空文庫形式のルビ記法を含むテキスト
   * @returns XHTMLルビタグに変換されたテキスト
   */
  fromAozoraRuby(text: string): string {
    rubyLogger.debug('ルビ変換処理を開始', { textLength: text.length });

    try {
      const div = document.createElement('div');
      div.textContent = text;

      const walker = document.createTreeWalker(
        div,
        NodeFilter.SHOW_TEXT,
        null
      );

      let currentNode = walker.nextNode();
      while (currentNode) {
        const node = currentNode as Text;
        const nodeText = node.textContent || '';

        if (nodeText.includes('《')) {
          rubyLogger.debug('ルビ記法を含むテキストノードを検出', {
            text: nodeText.substring(0, 50)
          });

          const fragment = document.createDocumentFragment();
          let lastIndex = 0;

          // ｜付きと漢字のみの両方のパターンを処理
          const matches = nodeText.matchAll(/(｜([^《]+?)|([一-龯々]+))《([^》]+?)》/g);
          for (const match of matches) {
            const [fullMatch, _, p1, kanji, rubyText] = match;
            const startIndex = match.index!;

            // Add text before ruby
            if (startIndex > lastIndex) {
              fragment.appendChild(
                document.createTextNode(nodeText.slice(lastIndex, startIndex))
              );
            }

            // Add ruby element
            const ruby = document.createElement('ruby');
            ruby.textContent = p1 || kanji;  // 本文
            const rt = document.createElement('rt');
            rt.textContent = rubyText;  // ルビ
            ruby.appendChild(rt);
            fragment.appendChild(ruby);

            lastIndex = startIndex + fullMatch.length;
          }

          // Add remaining text
          if (lastIndex < nodeText.length) {
            fragment.appendChild(
              document.createTextNode(nodeText.slice(lastIndex))
            );
          }

          node.replaceWith(fragment);
        }

        currentNode = walker.nextNode();
      }

      rubyLogger.debug('ルビ変換処理が完了');
      return div.innerHTML;

    } catch (error) {
      rubyLogger.error('ルビ変換処理でエラーが発生', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * XHTMLのルビタグを青空文庫形式のルビ記法に変換する
   * @param html XHTMLルビタグを含むテキスト
   * @returns 青空文庫形式のルビ記法に変換されたテキスト
   */
  toAozoraRuby(html: string): string {
    rubyLogger.debug('XHTMLから青空文庫形式への変換を開始', {
      textLength: html.length
    });

    // 1. まず全てのrp要素を除去
    let result = html.replace(/<rp>.*?<\/rp>/g, '');
    
    // 2. 全てのruby要素を変換
    result = result.replace(
      /<ruby>(?:<rb>)?([^<]+)(?:<\/rb>)?<rt>([^<]+)<\/rt>(?:<rtc>.*?<\/rtc>)?<\/ruby>/g,
      (_, base, ruby) => {
        // 漢字のみの場合は｜を省略
        const prefix = /^[一-龯々]+$/.test(base) ? '' : '｜';
        return `${prefix}${base}《${ruby}》`;
      }
    );

    rubyLogger.debug('青空文庫形式への変換が完了', {
      processedLength: result.length,
      sampleText: result.slice(0, 100)
    });

    return result;
  }

  /**
   * クラスメソッドとしてのtoAozoraRuby
   * @param html XHTMLルビタグを含むテキスト
   * @returns 青空文庫形式のルビ記法に変換されたテキスト
   */
  static toAozoraRuby(html: string): string {
    const processor = new RubyProcessor();
    return processor.toAozoraRuby(html);
  }
}