import { createContextLogger } from '@/lib/logger';

const emphasisLogger = createContextLogger('emphasis-processor');

/**
 * XHTML傍点タグと独自記法を相互に変換するプロセッサー
 */
export class EmphasisProcessor {
  /**
   * 独自記法をXHTML傍点タグに変換する
   * @param element 処理対象のDOM要素
   */
  fromEmphasisNotation(element: HTMLElement): void {
    emphasisLogger.debug('傍点変換処理を開始', { elementId: element.id });

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
        if (text.includes('《《')) {
          nodesToProcess.push(node);
        }
        currentNode = walker.nextNode();
      }

      for (const node of nodesToProcess) {
        const text = node.textContent || '';
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        const matches = text.matchAll(/《《([^》]+?)》》/g);
        for (const match of matches) {
          const [fullMatch, emphasisText] = match;
          const startIndex = match.index!;

          if (startIndex > lastIndex) {
            fragment.appendChild(
              document.createTextNode(text.slice(lastIndex, startIndex))
            );
          }

          const em = document.createElement('em');
          em.classList.add('emphasisDots');
          emphasisText.split('').forEach(char => {
            const span = document.createElement('span');
            span.textContent = char;
            em.appendChild(span);
          });
          fragment.appendChild(em);

          lastIndex = startIndex + fullMatch.length;
        }

        if (lastIndex < text.length) {
          fragment.appendChild(
            document.createTextNode(text.slice(lastIndex))
          );
        }

        node.replaceWith(fragment);
      }

      emphasisLogger.debug('傍点変換処理が完了');

    } catch (error) {
      emphasisLogger.error('傍点変換処理でエラーが発生', {
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
        const text = match
          .match(/<span>([^<]+)<\/span>/g)
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
}