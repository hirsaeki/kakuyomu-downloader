import { ConvertWidthStep } from "@/lib/typography/core/transform/steps/convert-width-step";
import type { TransformContext } from "@/lib/typography/core/transform/types";

describe("ConvertWidthStep", () => {
  const createContext = (text: string): TransformContext => ({ text });

  describe("numeric conversion", () => {
    let step: ConvertWidthStep;

    beforeEach(() => {
      step = new ConvertWidthStep("fullWidth", "numbers");
    });

    it("should convert half-width numbers to full-width", async () => {
      const result = await step.execute(createContext("123"));
      expect(result.textContent).toBe("１２３");
    });

    it("should preserve non-numeric characters", async () => {
      const result = await step.execute(createContext("12AB"));
      expect(result.textContent).toBe("１２AB");
    });

    it("should handle mixed content", async () => {
      const result = await step.execute(createContext("あ1B2い3"));
      expect(result.textContent).toBe("あ１B２い３");
    });
  });

  describe("alphabet conversion", () => {
    let step: ConvertWidthStep;

    beforeEach(() => {
      step = new ConvertWidthStep("fullWidth", "alphabet");
    });

    it("should convert half-width alphabet to full-width", async () => {
      const result = await step.execute(createContext("ABC"));
      expect(result.textContent).toBe("ＡＢＣ");
    });

    it("should preserve non-alphabet characters", async () => {
      const result = await step.execute(createContext("AB12"));
      expect(result.textContent).toBe("ＡＢ12");
    });

    it("should handle mixed content", async () => {
      const result = await step.execute(createContext("あAい1B2C"));
      expect(result.textContent).toBe("あＡい1Ｂ2Ｃ");
    });
  });

  describe("symbol conversion", () => {
    let step: ConvertWidthStep;

    beforeEach(() => {
      step = new ConvertWidthStep("fullWidth", "symbols");
    });

    it("should convert basic symbols", async () => {
      const result = await step.execute(createContext("!?@"));
      expect(result.textContent).toBe("！？＠");
    });

    it("should preserve non-symbol characters", async () => {
      const result = await step.execute(createContext("A!1?"));
      expect(result.textContent).toBe("A！1？");
    });
  });

  describe("direction handling", () => {
    it("should convert to half-width when specified", async () => {
      const step = new ConvertWidthStep("halfWidth", "numbers");
      const result = await step.execute(createContext("１２３"));
      expect(result.textContent).toBe("123");
    });

    it("should convert to full-width when specified", async () => {
      const step = new ConvertWidthStep("fullWidth", "numbers");
      const result = await step.execute(createContext("123"));
      expect(result.textContent).toBe("１２３");
    });
  });
});
