import { TransformError } from "@/lib/errors";
import { ConvertWidthStep } from "@/lib/typography/core/transform/steps/convert-width-step";
import type {
  TransformContext,
  WidthDirection,
  WidthTarget,
} from "@/lib/typography/core/transform/types";

describe("ConvertWidthStep", () => {
  const createContext = (text: string): TransformContext => ({ text });

  describe("isApplicable", () => {
    it.each<[WidthTarget, WidthDirection, string, boolean]>([
      ["numbers", "fullwidth", "123", true],
      ["numbers", "halfwidth", "１２３", true],
      ["alphabet", "fullwidth", "abc", true],
      ["alphabet", "halfwidth", "ａｂｃ", true],
      ["symbols", "fullwidth", "!@#", true],
      ["symbols", "halfwidth", "！＠＃", true],
      ["numbers", "fullwidth", "abc", false],
      ["alphabet", "fullwidth", "123", false],
      ["symbols", "fullwidth", "abc123", false],
    ])(
      "should correctly determine applicability for %s to %s conversion",
      (target, direction, text, expected) => {
        const step = new ConvertWidthStep(direction, target);
        expect(step.isApplicable(createContext(text))).toBe(expected);
      }
    );

    it("should handle invalid input gracefully", () => {
      const step = new ConvertWidthStep("fullwidth", "numbers");
      // @ts-expect-error: Testing invalid input
      expect(step.isApplicable(null)).toBe(false);
      // @ts-expect-error: Testing invalid input
      expect(step.isApplicable({})).toBe(false);
      // @ts-expect-error: Testing invalid input
      expect(step.isApplicable({ text: null })).toBe(false);
    });
  });

  describe("execute", () => {
    it.each<[WidthTarget, WidthDirection, string, string]>([
      ["numbers", "fullwidth", "123", "１２３"],
      ["numbers", "halfwidth", "１２３", "123"],
      ["alphabet", "fullwidth", "ABC", "ＡＢＣ"],
      ["alphabet", "halfwidth", "ＡＢＣ", "ABC"],
      ["symbols", "fullwidth", "!@#", "！＠＃"],
      ["symbols", "halfwidth", "！＠＃", "!@#"],
    ])(
      "should convert %s to %s correctly",
      async (target, direction, input, expected) => {
        const step = new ConvertWidthStep(direction, target);
        const result = await step.execute(createContext(input));
        expect(result.textContent).toBe(expected);
      }
    );

    it("should handle mixed content correctly", async () => {
      const step = new ConvertWidthStep("fullwidth", "numbers");
      const result = await step.execute(createContext("abc123def"));
      expect(result.textContent).toBe("abc１２３def");
    });

    it("should preserve untargeted characters", async () => {
      const step = new ConvertWidthStep("fullwidth", "alphabet");
      const result = await step.execute(createContext("123abc!@#"));
      expect(result.textContent).toBe("123ＡＢＣ!@#");
    });

    it("should throw TransformError for invalid input", async () => {
      const step = new ConvertWidthStep("fullwidth", "numbers");
      await expect(step.execute(createContext("abc"))).rejects.toThrow(
        TransformError
      );
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", async () => {
      const step = new ConvertWidthStep("fullwidth", "numbers");
      await expect(step.execute(createContext(""))).rejects.toThrow(
        TransformError
      );
    });

    it("should handle whitespace", async () => {
      const step = new ConvertWidthStep("fullwidth", "symbols");
      const result = await step.execute(createContext(" "));
      expect(result.textContent).toBe("　");
    });

    it("should handle long text efficiently", async () => {
      const step = new ConvertWidthStep("fullwidth", "numbers");
      const input = "123".repeat(1000);
      const expected = "１２３".repeat(1000);
      const result = await step.execute(createContext(input));
      expect(result.textContent).toBe(expected);
    });

    it("should handle all ASCII symbols", async () => {
      const step = new ConvertWidthStep("fullwidth", "symbols");
      const input = "!@#$%^&*()_+-=[]\\{}|;':\",./<>?`~";
      const result = await step.execute(createContext(input));
      expect(result.textContent).toBe(
        '！＠＃＄％＾＆＊（）＿＋－＝［］＼｛｝｜；’："，．／＜＞？｀～'
      );
    });
  });
});
