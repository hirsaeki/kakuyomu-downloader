import { TransformError } from "@/lib/errors";
import { ReplaceStep } from "@/lib/typography/core/transform/steps/replace-step";
import type { TransformContext } from "@/lib/typography/core/transform/types";

describe("ReplaceStep", () => {
  const createContext = (text: string): TransformContext => ({ text });

  describe("initialization", () => {
    it("should initialize with valid patterns", () => {
      expect(() => new ReplaceStep("test", "replace")).not.toThrow();
      expect(() => new ReplaceStep("\\d+", "num")).not.toThrow();
    });

    it("should throw on invalid regex patterns", () => {
      expect(() => new ReplaceStep("[", "invalid")).toThrow(TransformError);
      expect(() => new ReplaceStep("(unmatched", "invalid")).toThrow(
        TransformError
      );
    });
  });

  describe("isApplicable", () => {
    it("should return true for text containing patterns", () => {
      const step = new ReplaceStep("test", "replace");
      expect(step.isApplicable(createContext("this is a test"))).toBe(true);
    });

    it("should return false for text without patterns", () => {
      const step = new ReplaceStep("xyz", "abc");
      expect(step.isApplicable(createContext("test case"))).toBe(false);
    });

    it("should handle regex patterns correctly", () => {
      const step = new ReplaceStep("\\d+", "number");
      expect(step.isApplicable(createContext("test 123 test"))).toBe(true);
      expect(step.isApplicable(createContext("test abc test"))).toBe(false);
    });

    it("should handle special characters safely", () => {
      const step = new ReplaceStep("[.*+?^${}()|[\\]\\\\]", "special");
      expect(step.isApplicable(createContext("test [ test"))).toBe(true);
      expect(step.isApplicable(createContext("test } test"))).toBe(true);
    });

    it("should handle invalid input gracefully", () => {
      const step = new ReplaceStep("test", "replace");
      // @ts-expect-error: Testing invalid input
      expect(step.isApplicable(null)).toBe(false);
      // @ts-expect-error: Testing invalid input
      expect(step.isApplicable({})).toBe(false);
      // @ts-expect-error: Testing invalid input
      expect(step.isApplicable({ text: null })).toBe(false);
    });
  });

  describe("execute", () => {
    it("should replace simple patterns correctly", async () => {
      const step = new ReplaceStep("test", "replace");
      const result = await step.execute(createContext("this is a test case"));
      expect(result.textContent).toBe("this is a replace case");
    });

    it("should replace all occurrences by default", async () => {
      const step = new ReplaceStep("test", "replace");
      const result = await step.execute(createContext("test test test"));
      expect(result.textContent).toBe("replace replace replace");
    });

    it("should handle regex patterns correctly", async () => {
      const step = new ReplaceStep("\\d+", "number");
      const result = await step.execute(createContext("test 123 test 456"));
      expect(result.textContent).toBe("test number test number");
    });

    it("should preserve unmatched content", async () => {
      const step = new ReplaceStep("xyz", "abc");
      const result = await step.execute(createContext("test xyz test"));
      expect(result.textContent).toBe("test abc test");
    });

    it("should throw TransformError for non-applicable text", async () => {
      const step = new ReplaceStep("xyz", "abc");
      await expect(step.execute(createContext("test test"))).rejects.toThrow(
        TransformError
      );
    });
  });

  describe("edge cases", () => {
    it("should handle empty strings", async () => {
      const step = new ReplaceStep("test", "replace");
      await expect(step.execute(createContext(""))).rejects.toThrow(
        TransformError
      );
    });

    it("should handle whitespace-only strings", async () => {
      const step = new ReplaceStep("\\s+", " ");
      const result = await step.execute(createContext("  \t\n  "));
      expect(result.textContent).toBe(" ");
    });

    it("should handle long texts efficiently", async () => {
      const step = new ReplaceStep("test", "replace");
      const input = "test ".repeat(1000);
      const result = await step.execute(createContext(input));
      expect(result.textContent).toBe("replace ".repeat(1000));
    });

    it("should handle regex capture groups", async () => {
      const step = new ReplaceStep("(\\d+)", "num:$1");
      const result = await step.execute(createContext("test 123 test"));
      expect(result.textContent).toBe("test num:123 test");
    });

    it("should handle unicode characters", async () => {
      const step = new ReplaceStep("テスト", "TEST");
      const result = await step.execute(createContext("これはテストです"));
      expect(result.textContent).toBe("これはTESTです");
    });
  });
});
