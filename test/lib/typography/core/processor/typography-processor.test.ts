import { TypographyProcessor } from "@/lib/typography/core/processor/typography-processor";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  createContextLogger: () => ({
    debug: vi.fn((message, ...args) => console.log(`[DEBUG] ${message}`, ...args)),
    info: vi.fn((message, ...args) => console.log(`[INFO] ${message}`, ...args)),
    warn: vi.fn((message, ...args) => console.warn(`[WARN] ${message}`, ...args)),
    error: vi.fn((message, ...args) => console.error(`[ERROR] ${message}`, ...args)),
  }),
}));

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

    it("should sanitize content", async () => {
      const input = '<p>Test</p><script>alert("xss")</script>';
      const result = await processor.process(input);
      expect(result).toBe("<p>Test</p>");  // スクリプトタグが完全に除去されることを確認
    });
  });

  describe("Single step processing", () => {
    const patterns = {
      "replace-test": {
        name: "replace-test",
        pattern: {
          source: "\\btest\\b",  // 単語境界を明示的に指定
          flags: "g"
        },
        transform: {
          type: "text" as const,
          steps: [
            {
              action: "replace" as const,
              from: "^.*$",  // マッチしたテキスト全体を置換
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
      expect(result).toBe(input);  // 'test'が単語の一部なので置換されない
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
        basePriority: 200,  // 優先度設定がない場合のベース優先度
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
        basePriority: 100,  // 優先度設定がない場合のベース優先度
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

    it("should fallback to basePriority when priority is not set", async () => {
      const patternsWithoutPriority = {
        "pattern1": {
          name: "pattern1",
          pattern: {
            source: "\\btest\\b",
            flags: "g",
          },
          transform: {
            type: "text" as const,
            steps: [{ action: "replace" as const, from: "^.*$", to: "TEST1" }],
          },
          basePriority: 1,
        },
        "pattern2": {
          name: "pattern2",
          pattern: {
            source: "\\btest\\b",
            flags: "g",
          },
          transform: {
            type: "text" as const,
            steps: [{ action: "replace" as const, from: "^.*$", to: "TEST2" }],
          },
          basePriority: 2,
        },
      };

      const processorWithoutPriority = TypographyProcessor.getInstance(Object.values(patternsWithoutPriority));
      const result = await processorWithoutPriority.process("<p>test</p>");
      expect(result).toBe("<p>TEST1</p>");  // basePriorityが小さい方が先に適用される
    });
  });

  describe("TCY processing", () => {
    const patterns = {
      "test-tcy": {
        name: "test-tcy",
        pattern: {
          source: "([0-9０-９]{2})",  // 半角と全角の数字にマッチ
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
});
