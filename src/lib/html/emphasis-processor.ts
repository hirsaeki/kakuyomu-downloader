import { createContextLogger } from "@/lib/logger";

const emphasisLogger = createContextLogger("emphasis-processor");

/**
 * XHTML傍点タグと独自記法を相互に変換するプロセッサー
 */
export class EmphasisProcessor {
  /**
   * 独自記法をXHTML傍点タグに変換する
   * @param text 独自記法を含むテキスト
   * @returns XHTML傍点タグに変換されたテキスト
   */
  fromEmphasisNotation(text: string): string {
    emphasisLogger.debug("傍点変換処理を開始", { textLength: text.length });

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
        const nodeText = node.textContent || "";

        if (nodeText.includes("《《")) {
          emphasisLogger.debug("傍点記法を含むテキストノードを検出", {
            text: nodeText.substring(0, 50),
          });

          const fragment = document.createDocumentFragment();
          let lastIndex = 0;

          const matches = nodeText.matchAll(/《《([^》]+?)》》/g);
          for (const match of matches) {
            const [fullMatch, emphasisText] = match;
            const startIndex = match.index!;

            // Add text before emphasis
            if (startIndex > lastIndex) {
              fragment.appendChild(
                document.createTextNode(nodeText.slice(lastIndex, startIndex))
              );
            }

            // Add emphasis element
            const em = document.createElement("em");
            em.classList.add("emphasisDots");
            emphasisText.split("").forEach((char) => {
              const span = document.createElement("span");
              span.textContent = char;
              em.appendChild(span);
            });
            fragment.appendChild(em);

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

      emphasisLogger.debug("傍点変換処理が完了");
      return div.innerHTML;

    } catch (error) {
      emphasisLogger.error("傍点変換処理でエラーが発生", {
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : "Unknown error",
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
    emphasisLogger.debug("XHTMLから独自記法への変換を開始", {
      textLength: html.length,
    });

    // 傍点を持つ文字列を抽出して変換
    const result = html.replace(
      /<em class="emphasisDots">(?:<span>([^<]+)<\/span>)+<\/em>/g,
      (match) => {
        // span内の文字を抽出して結合
        const text = match
          .match(/<span>([^<]+)<\/span>/g)
          ?.map((span) => span.replace(/<\/?span>/g, ""))
          .join("");
        return `《《${text}》》`;
      }
    );

    emphasisLogger.debug("独自記法への変換が完了", {
      processedLength: result.length,
      sampleText: result.slice(0, 100),
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
}