import { TypographyProcessor } from "@/lib/typography/core/processor/typography-processor";
import { beforeEach, describe, expect, it } from "vitest";

describe("TypographyProcessor", () => {
  beforeEach(() => {
    // 各テストの前にインスタンスをリセット
    TypographyProcessor["instance"] = null;
  });

  describe("Basic text processing", () => {
    const patterns = {
      "test-fullWidth": {
        name: "test-fullWidth",
        pattern: {
          source: "([0-9a-zA-Z])",
          flags: "g",
        },
        transform: {
          type: "text" as const,
          steps: [
            {
              action: "convertWidth" as const,
              target: "numbers" as const,
              direction: "fullWidth" as const,
            },
          ],
        },
        priority: 1,
      },
    };

    let processor: TypographyProcessor;

    beforeEach(() => {
      processor = TypographyProcessor.getInstance(Object.values(patterns));
    });

    it("should convert single digits to fullWidth", async () => {
      const input = "<p>This is 1 test.</p>";
      const expected = "<p>This is １ test.</p>";
      const result = await processor.process(input);
      expect(result).toBe(expected);
    });

    it("should handle empty content", async () => {
      await expect(processor.process("")).rejects.toThrow(
        "HTML content is empty"
      );
    });

    it("should remove script tags but preserve text", async () => {
      const input = '<p>Test</p><script>alert("xss")</script>';
      const result = await processor.process(input);
      expect(result).toBe("<p>Test</p>"); // Script tag should be removed
    });
  });

  describe("Single step processing", () => {
    const patterns = {
      "replace-test": {
        name: "replace-test",
        pattern: {
          source: "\\btest\\b", // 単語境界を明示的に指定
          flags: "g",
        },
        transform: {
          type: "text" as const,
          steps: [
            {
              action: "replace" as const,
              from: "^.*$", // マッチしたテキスト全体を置換
              to: "TEST_REPLACED",
            },
          ],
        },
        priority: 1,
      },
    };

    let processor: TypographyProcessor;

    beforeEach(() => {
      processor = TypographyProcessor.getInstance(Object.values(patterns));
    });

    it("should apply a single replace step correctly", async () => {
      const input = "<p>This is a test.</p>";
      const expected = "<p>This is a TEST_REPLACED.</p>";
      const result = await processor.process(input);
      expect(result).toBe(expected);
    });

    it("should not replace partial matches", async () => {
      const input = "<p>testing</p>";
      const result = await processor.process(input);
      expect(result).toBe(input); // 'test'が単語の一部なので置換されない
    });
  });

  describe("Priority handling", () => {
    const patterns = {
      "low-priority": {
        name: "low-priority",
        pattern: {
          source: "\\btest\\b",
          flags: "g",
        },
        transform: {
          type: "text" as const,
          steps: [
            {
              action: "replace" as const,
              from: "^.*$",
              to: "TEST_LOW",
            },
          ],
        },
        priority: 2,
        basePriority: 200, // 優先度設定がない場合のベース優先度
      },
      "high-priority": {
        name: "high-priority",
        pattern: {
          source: "\\btest\\b",
          flags: "g",
        },
        transform: {
          type: "text" as const,
          steps: [
            {
              action: "replace" as const,
              from: "^.*$",
              to: "TEST_HIGH",
            },
          ],
        },
        priority: 1,
        basePriority: 100, // 優先度設定がない場合のベース優先度
      },
    };

    let processor: TypographyProcessor;

    beforeEach(() => {
      processor = TypographyProcessor.getInstance(Object.values(patterns));
    });

    it("should apply patterns in priority order", async () => {
      const input = "<p>test</p>";
      const result = await processor.process(input);
      // 優先度が高い（数値が小さい）パターンが先に適用される
      expect(result).toBe("<p>TEST_HIGH</p>");
    });
  });

  describe("TCY processing", () => {
    const patterns = {
      "test-tcy": {
        name: "test-tcy",
        pattern: {
          source: "([0-9０-９]{2})", // 半角と全角の数字にマッチ
          flags: "g",
        },
        transform: {
          type: "tcy" as const,
          steps: [
            {
              action: "convertWidth" as const,
              target: "numbers" as const,
              direction: "halfWidth" as const,
            },
          ],
        },
        priority: 1,
      },
    };

    let processor: TypographyProcessor;

    beforeEach(() => {
      processor = TypographyProcessor.getInstance(Object.values(patterns));
    });

    it("should wrap two-digit numbers with TCY markers", async () => {
      const input = "<p>これは４２です</p>";
      const expected = "<p>これは〘42〙です</p>";
      const result = await processor.process(input);
      expect(result).toBe(expected);
    });

    it("should handle mixed width numbers", async () => {
      const input = "<p>これは4２です</p>";
      const expected = "<p>これは〘42〙です</p>";
      const result = await processor.process(input);
      expect(result).toBe(expected);
    });
  });

  describe("HTML structure preservation 1", () => {
    const patterns = {
      "test-conversion": {
        name: "test-conversion",
        pattern: {
          source: "([0-9])",
          flags: "g",
        },
        transform: {
          type: "text" as const,
          steps: [
            {
              action: "convertWidth" as const,
              target: "numbers" as const,
              direction: "fullWidth" as const,
            },
          ],
        },
        priority: 1,
      },
    };

    let processor: TypographyProcessor;

    beforeEach(() => {
      processor = TypographyProcessor.getInstance(Object.values(patterns));
    });

    it("should preserve HTML tag structure", async () => {
      const input = "<h1>Title 1</h1><p>Paragraph 2</p>";
      const result = await processor.process(input);
      expect(result).toBe("<h1>Title １</h1><p>Paragraph ２</p>");
    });

    it("should handle nested tags", async () => {
      const input = "<div><p>Level 1 <span>Level 2</span></p></div>";
      const result = await processor.process(input);
      expect(result).toBe("<div><p>Level １ <span>Level ２</span></p></div>");
    });

    it("should preserve allowed attributes", async () => {
      const input = '<p class="test" id="p1">Test 1</p>';
      const result = await processor.process(input);
      expect(result).toBe('<p class="test" id="p1">Test １</p>');
    });

    it("should preserve content of non-allowed tags", async () => {
      const input = "<p>Test 1 <unknown>Test 2</unknown> Test 3</p>";
      const result = await processor.process(input);
      expect(result).toBe("<p>Test １ Test ２ Test ３</p>");
    });
  });

  describe("HTML structure preservation 2", () => {
    const alphanum_patterns = {
      "test-convert-mixed": {
        name: "test-convert-mixed",
        pattern: {
          source: "([a-zA-Z0-9])", // 英数字両方にマッチ
          flags: "g",
        },
        transform: {
          type: "text" as const,
          steps: [
            {
              action: "convertWidth" as const,
              target: "alphabet" as const,
              direction: "fullWidth" as const,
            },
            {
              action: "convertWidth" as const,
              target: "numbers" as const,
              direction: "fullWidth" as const,
            },
          ],
        },
        priority: 1,
      },
    };

    it("should preserve HTML tags while converting text", async () => {
      const processor = TypographyProcessor.getInstance(
        Object.values(alphanum_patterns)
      );
      const input = "<div>This <h1>h1</h1> <p>and p and</p> <h2>h2</h2></div>";
      const result = await processor.process(input);
      expect(result).toBe(
        "<div>This <h1>ｈ１</h1> <p>ａｎｄ ｐ ａｎｄ</p> <h2>ｈ２</h2></div>"
      );
    });
  });

  describe("HTML structure preservation on linebreak", () => {
    const tagPatterns = {
      "convert-tag-chars": {
        name: "convert-tag-chars",
        pattern: {
          // source: "^[^\n<>]+$|(?<=^[^\n<>]*)\n(?=[^\n<>]*$)", // テキストノードの全体または、その中の改行を対象に
          source: "\nL", //
          flags: "g",
        },
        transform: {
          type: "text" as const,
          steps: [
            {
              action: "replace" as const,
              from: "\n",
              to: "\u301c\n",
            },
          ],
        },
        priority: 1,
      },
    };

    it("should preserve HTML structure with text nodes containing line breaks", async () => {
      const processor = TypographyProcessor.getInstance(
        Object.values(tagPatterns)
      );

      const input = "<p>First\nLine</p>\nSecond\nLine\n<p>Third\nLine</p>";
      const result = await processor.process(input);

      // タグはそのまま、テキストノード内の改行のみ処理される
      expect(result).toBe(
        "<p>First〜\nLine</p>\nSecond\nLine\n<p>Third〜\nLine</p>"
      );
    });
  });
});
