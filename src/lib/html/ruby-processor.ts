import { createContextLogger } from '@/lib/logger';

const rubyLogger = createContextLogger('ruby-processor');

/**
 * XHTMLルビタグと青空文庫形式のルビ記法を相互に変換するプロセッサー
 */
export class RubyProcessor {
  /**
   * 青空文庫形式のルビ記法をXHTMLルビタグに変換する
   * @param element 対象のDOM要素
   */
  fromAozoraRuby(element: HTMLElement): void {
    rubyLogger.debug('ルビ変換処理を開始', { elementId: element.id });

    try {
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null
      );

      const nodesToProcess: Text[] = [];
      let currentNode = walker.nextNode();
      while (currentNode) {
        const node = currentNode as Text;
        const text = node.textContent || '';
        if (text.includes('《')) {
          nodesToProcess.push(node);
        }
        currentNode = walker.nextNode();
      }

      for (const node of nodesToProcess) {
        const text = node.textContent || '';
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        const matches = text.matchAll(/(｜([^《]+?)|([一-龯々]+))《([^》]+?)》/g);
        for (const match of matches) {
          const [fullMatch, _, p1, kanji, rubyText] = match;
          const startIndex = match.index!;

          if (startIndex > lastIndex) {
            fragment.appendChild(
              document.createTextNode(text.slice(lastIndex, startIndex))
            );
          }

          const ruby = document.createElement('ruby');
          ruby.textContent = p1 || kanji;
          const rt = document.createElement('rt');
          rt.textContent = rubyText;
          ruby.appendChild(rt);
          fragment.appendChild(ruby);

          lastIndex = startIndex + fullMatch.length;
        }

        if (lastIndex < text.length) {
          fragment.appendChild(
            document.createTextNode(text.slice(lastIndex))
          );
        }

        node.replaceWith(fragment);
      }

      rubyLogger.debug('ルビ変換処理が完了');

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
}