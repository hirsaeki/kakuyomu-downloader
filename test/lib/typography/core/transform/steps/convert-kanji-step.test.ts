import { TransformError } from "@/lib/errors";
import { ConvertKanjiStep } from "@/lib/typography/core/transform/steps/convert-kanji-step";
import type { TransformContext } from "@/lib/typography/core/transform/types";

describe("ConvertKanjiStep", () => {
  const createContext = (text: string): TransformContext => ({ text });
  let step: ConvertKanjiStep;

  beforeEach(() => {
    step = new ConvertKanjiStep();
  });

  describe("isApplicable", () => {
    it("should return true for valid numeric strings", () => {
      expect(step.isApplicable(createContext("123"))).toBe(true);
      expect(step.isApplicable(createContext("0"))).toBe(true);
      expect(step.isApplicable(createContext("9999"))).toBe(true);
    });

    it("should return false for non-numeric strings", () => {
      expect(step.isApplicable(createContext("abc"))).toBe(false);
      expect(step.isApplicable(createContext("一二三"))).toBe(false);
      expect(step.isApplicable(createContext("12a3"))).toBe(false);
    });

    it("should return false for excessively long numbers", () => {
      expect(step.isApplicable(createContext("1".repeat(20)))).toBe(false);
    });

    it("should handle invalid input gracefully", () => {
      // @ts-expect-error: Testing invalid input
      expect(step.isApplicable(null)).toBe(false);
      // @ts-expect-error: Testing invalid input
      expect(step.isApplicable({})).toBe(false);
      // @ts-expect-error: Testing invalid input
      expect(step.isApplicable({ text: null })).toBe(false);
    });
  });

  describe("execute", () => {
    it("should convert single digits correctly", async () => {
      const expectations: [string, string][] = [
        ["0", "〇"],
        ["1", "一"],
        ["2", "二"],
        ["3", "三"],
        ["4", "四"],
        ["5", "五"],
        ["6", "六"],
        ["7", "七"],
        ["8", "八"],
        ["9", "九"],
      ];

      for (const [input, expected] of expectations) {
        const result = await step.execute(createContext(input));
        expect(result.textContent).toBe(expected);
      }
    });

    it("should convert multi-digit numbers correctly", async () => {
      const expectations: [string, string][] = [
        ["10", "一〇"],
        ["42", "四二"],
        ["100", "一〇〇"],
        ["999", "九九九"],
        ["1234", "一二三四"],
      ];

      for (const [input, expected] of expectations) {
        const result = await step.execute(createContext(input));
        expect(result.textContent).toBe(expected);
      }
    });

    it("should throw TransformError for invalid input", async () => {
      await expect(step.execute(createContext("abc"))).rejects.toThrow(
        TransformError
      );

      await expect(step.execute(createContext("12.34"))).rejects.toThrow(
        TransformError
      );

      await expect(step.execute(createContext("-123"))).rejects.toThrow(
        TransformError
      );
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", async () => {
      await expect(step.execute(createContext(""))).rejects.toThrow(
        TransformError
      );
    });

    it("should handle whitespace", async () => {
      await expect(step.execute(createContext(" 123 "))).resolves.toEqual({
        textContent: "一二三",
      });
    });

    it("should handle leading zeros", async () => {
      const result = await step.execute(createContext("001"));
      expect(result.textContent).toBe("〇〇一");
    });

    it("should reject floating point numbers", async () => {
      await expect(step.execute(createContext("1.23"))).rejects.toThrow(
        TransformError
      );
    });

    it("should reject scientific notation", async () => {
      await expect(step.execute(createContext("1e3"))).rejects.toThrow(
        TransformError
      );
    });

    it("should handle consecutive conversions efficiently", async () => {
      const results = await Promise.all(
        Array.from({ length: 100 }, (_, i) =>
          step.execute(createContext(i.toString()))
        )
      );
      expect(results.length).toBe(100);
      expect(results[99].textContent).toBe("九九");
    });
  });
});
