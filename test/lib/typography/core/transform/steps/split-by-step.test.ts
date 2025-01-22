import { TransformError } from "@/lib/errors";
import { SplitByStep } from "@/lib/typography/core/transform/steps/split-by-step";
import type { TransformContext } from "@/lib/typography/core/transform/types";

describe("SplitByStep", () => {
  const createContext = (text: string): TransformContext => ({ text });

  describe("initialization", () => {
    it("should initialize with valid separators", () => {
      expect(() => new SplitByStep(",")).not.toThrow();
      expect(() => new SplitByStep([",", "|"])).not.toThrow();
    });

    it("should throw on empty separator array", () => {
      expect(() => new SplitByStep([])).toThrow(TransformError);
    });

    it("should throw on empty separator string", () => {
      expect(() => new SplitByStep("")).toThrow(TransformError);
    });

    it("should handle custom join string", () => {
      expect(() => new SplitByStep(",", " | ")).not.toThrow();
    });
  });

  describe("isApplicable", () => {
    it("should return true for text containing separator", () => {
      const step = new SplitByStep(",");
      expect(step.isApplicable(createContext("a,b,c"))).toBe(true);
    });

    it("should return false for text without separator", () => {
      const step = new SplitByStep(",");
      expect(step.isApplicable(createContext("abc"))).toBe(false);
    });

    it("should handle multiple separators correctly", () => {
      const step = new SplitByStep([",", "|"]);
      expect(step.isApplicable(createContext("a,b|c"))).toBe(true);
      expect(step.isApplicable(createContext("abc"))).toBe(false);
    });

    it("should handle special characters safely", () => {
      const step = new SplitByStep(["[", ".", "*"]);
      expect(step.isApplicable(createContext("a[b.c*d"))).toBe(true);
    });

    it("should handle invalid input gracefully", () => {
      const step = new SplitByStep(",");
      // @ts-expect-error: Testing invalid input
      expect(step.isApplicable(null)).toBe(false);
      // @ts-expect-error: Testing invalid input
      expect(step.isApplicable({})).toBe(false);
      // @ts-expect-error: Testing invalid input
      expect(step.isApplicable({ text: null })).toBe(false);
    });
  });

  describe("execute", () => {
    it("should split and join with default settings", async () => {
      const step = new SplitByStep(",");
      const result = await step.execute(createContext("a,b,c"));
      expect(result.textContent).toBe("a\nb\nc");
    });

    it("should split with multiple separators", async () => {
      const step = new SplitByStep([",", "|"]);
      const result = await step.execute(createContext("a,b|c"));
      expect(result.textContent).toBe("a\nb\nc");
    });

    it("should use custom join string", async () => {
      const step = new SplitByStep(",", " | ");
      const result = await step.execute(createContext("a,b,c"));
      expect(result.textContent).toBe("a | b | c");
    });

    it("should trim whitespace by default", async () => {
      const step = new SplitByStep(",");
      const result = await step.execute(createContext(" a , b , c "));
      expect(result.textContent).toBe("a\nb\nc");
    });

    it("should throw TransformError for non-applicable text", async () => {
      const step = new SplitByStep(",");
      await expect(step.execute(createContext("abc"))).rejects.toThrow(
        TransformError
      );
    });
  });

  describe("edge cases", () => {
    it("should handle empty input string", async () => {
      const step = new SplitByStep(",");
      await expect(step.execute(createContext(""))).rejects.toThrow(
        TransformError
      );
    });

    it("should handle consecutive separators", async () => {
      const step = new SplitByStep(",");
      const result = await step.execute(createContext("a,,b,,c"));
      expect(result.textContent).toBe("a\nb\nc");
    });

    it("should handle long text efficiently", async () => {
      const step = new SplitByStep(",");
      const input = "item,".repeat(1000) + "last";
      const result = await step.execute(createContext(input));
      expect(result.textContent).toBe("item\n".repeat(1000) + "last");
    });

    it("should handle regex special characters in separators", async () => {
      const step = new SplitByStep([
        "*",
        ".",
        "[",
        "]",
        "(",
        ")",
        "+",
        "?",
        "|",
      ]);
      const result = await step.execute(createContext("a*b.c[d]e(f)g+h?i|j"));
      expect(result.textContent).toBe("a\nb\nc\nd\ne\nf\ng\nh\ni\nj");
    });

    it("should handle unicode separators", async () => {
      const step = new SplitByStep("。");
      const result = await step.execute(createContext("これは。テストです。"));
      expect(result.textContent).toBe("これは\nテストです");
    });
  });
});
