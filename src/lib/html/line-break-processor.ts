import { createContextLogger } from "@/lib/logger";

const lineBreakLogger = createContextLogger("line-break-processor");

/**
 * 段落内の改行コードを<br />タグに変換するプロセッサー
 */
export class LineBreakProcessor {
  private static readonly VALID_TAGS = [
    "p",
    "div",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "span",
    "a",
    "b",
    "i",
    "strong",
    "em",
    "br",
  ];

  constructor() {}

  process(text: string): string {
    if (!text.trim()) return text;

    lineBreakLogger.debug("改行処理を開始", { textLength: text.length });

    try {
      let processedHtml = "";
      const nodes = this.splitTextIntoNodes(text);

      for (const node of nodes) {
        if (node.type === "invalid") {
          // 無効なタグの場合は、コンテンツのみを処理
          processedHtml += this.process(node.content);
        } else if (node.type === "text") {
          // テキストの場合は改行を<br />に変換
          processedHtml += node.content.replace(/\n/g, "<br />\n");
        } else {
          // 有効なタグの場合はコンテンツを再帰的に処理
          if (node.content) {
            const processedContent = this.process(node.content);
            const [startTag, endTag] = node.raw.split(node.content);
            processedHtml += startTag + processedContent + endTag;
          } else {
            processedHtml += node.raw;
          }
        }
      }

      lineBreakLogger.debug("改行処理が完了", {
        processedLength: processedHtml.length,
        sampleText: processedHtml.slice(0, 100),
      });

      return processedHtml;
    } catch (error) {
      lineBreakLogger.error("改行処理でエラーが発生", {
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : "Unknown error",
      });
      return text;
    }
  }

  private splitTextIntoNodes(
    text: string
  ): Array<{ type: "tag" | "text" | "invalid"; content: string; raw: string }> {
    const nodes: Array<{
      type: "tag" | "text" | "invalid";
      content: string;
      raw: string;
    }> = [];
    let currentIndex = 0;
    let lastIndex = 0;

    const tagRegex = /<[^>]+>/g;
    let match;

    while ((match = tagRegex.exec(text)) !== null) {
      const startIndex = match.index;
      const endIndex = tagRegex.lastIndex;

      // タグの前にテキストがあれば追加
      if (startIndex > currentIndex) {
        nodes.push({
          type: "text",
          content: text.slice(currentIndex, startIndex),
          raw: text.slice(currentIndex, startIndex),
        });
      }

      const tagContent = match[0];
      const tagMatch = tagContent.match(/<\/?([^\s>]+)/);

      if (tagMatch) {
        const tagName = tagMatch[1].toLowerCase();
        const isValidTag = LineBreakProcessor.VALID_TAGS.includes(tagName);

        if (tagContent.match(/<([^>\/>]+)[^>]*>.*?<\/\1>/)) {
          // 開始タグと終了タグがある場合
          const innerContent = tagContent.replace(/^<[^>]*>|<\/[^>]*>$/g, "");
          nodes.push({
            type: isValidTag ? "tag" : "invalid",
            content: innerContent,
            raw: tagContent,
          });
        } else if (!tagContent.endsWith("/>")) {
          // 単独タグの場合
          nodes.push({
            type: isValidTag ? "tag" : "invalid",
            content: "",
            raw: tagContent,
          });
        } else {
          // 自己終了タグの場合
          nodes.push({
            type: isValidTag ? "tag" : "text",
            content: "",
            raw: isValidTag ? tagContent : "",
          });
        }
      }

      currentIndex = endIndex;
      lastIndex = endIndex;
    }

    // 最後のテキストがあれば追加
    if (lastIndex < text.length) {
      nodes.push({
        type: "text",
        content: text.slice(lastIndex),
        raw: text.slice(lastIndex),
      });
    }

    return nodes;
  }
}
