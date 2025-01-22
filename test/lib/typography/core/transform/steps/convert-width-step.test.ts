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
      ["numbers", "fullWidth", "123", true],
      ["numbers", "halfWidth", "１２３", true],
      ["alphabet", "fullWidth", "abc", true],
      ["alphabet", "halfWidth", "ａｂｃ", true],
      ["symbols", "fullWidth", "!@#", true],
      ["symbols", "halfWidth", "！＠＃", true],
      ["numbers", "fullWidth", "abc", false],
      ["alphabet", "fullWidth", "123", false],
      ["symbols", "fullWidth", "abc123", false],
    ])(
      "should correctly determine applicability for %s to %s conversion",
      (target, direction, text, expected) => {
        const step = new ConvertWidthStep(direction, target);
        expect(step.isApplicable(createContext(text))).toBe(expected);
      }
    );

    it("should handle invalid input gracefully", () => {
      const step = new ConvertWidthStep("fullWidth", "numbers");
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
      ["numbers", "fullWidth", "123", "１２３"],
      ["numbers", "halfWidth", "１２３", "123"],
      ["alphabet", "fullWidth", "ABC", "ＡＢＣ"],
      ["alphabet", "halfWidth", "ＡＢＣ", "ABC"],
      ["symbols", "fullWidth", "!@#", "！＠＃"],
      ["symbols", "halfWidth", "！＠＃", "!@#"],
    ])(
      "should convert %s to %s correctly",
      async (target, direction, input, expected) => {
        const step = new ConvertWidthStep(direction, target);
        const result = await step.execute(createContext(input));
        expect(result.textContent).toBe(expected);
      }
    );

    it("should handle mixed content correctly", async () => {
      const step = new ConvertWidthStep("fullWidth", "numbers");
      const result = await step.execute(createContext("abc123def"));
      expect(result.textContent).toBe("abc１２３def");
    });

    it("should preserve un-targeted characters", async () => {
      const step = new ConvertWidthStep("fullWidth", "alphabet");
      const result = await step.execute(createContext("123abc!@#"));
      expect(result.textContent).toBe("123ａｂｃ!@#");
    });

    it("should throw TransformError for invalid input", async () => {
      const step = new ConvertWidthStep("fullWidth", "numbers");
      await expect(step.execute(createContext("abc"))).rejects.toThrow(
        TransformError
      );
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", async () => {
      const step = new ConvertWidthStep("fullWidth", "numbers");
      await expect(step.execute(createContext(""))).rejects.toThrow(
        TransformError
      );
    });

    it("should handle whitespace", async () => {
      const step = new ConvertWidthStep("fullWidth", "symbols");
      const result = await step.execute(createContext(" "));
      expect(result.textContent).toBe("　");
    });

    it("should handle long text efficiently", async () => {
      const step = new ConvertWidthStep("fullWidth", "numbers");
      const input = "123".repeat(1000);
      const expected = "１２３".repeat(1000);
      const result = await step.execute(createContext(input));
      expect(result.textContent).toBe(expected);
    });

    it("should handle all ASCII symbols", async () => {
      const step = new ConvertWidthStep("fullWidth", "symbols");
      const input = "!@#$%^&*()_+-=[]\\{}|;':\",./<>?`~";
      const result = await step.execute(createContext(input));
      expect(result.textContent).toBe(
        "！＠＃＄％＾＆＊（）＿＋－＝［］＼｛｝｜；’：”，．／＜＞？｀～"
      );
    });
  });
});
