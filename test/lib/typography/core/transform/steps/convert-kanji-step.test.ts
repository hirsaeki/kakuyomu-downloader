import { ConvertKanjiStep } from "@/lib/typography/core/transform/steps/convert-kanji-step";
import type { TransformContext } from "@/lib/typography/core/transform/types";

describe("ConvertKanjiStep", () => {
  const createContext = (text: string): TransformContext => ({ text });
  let step: ConvertKanjiStep;

  beforeEach(() => {
    step = new ConvertKanjiStep();
  });

  describe("execute", () => {
    it("should convert simple numeric string to kanji", async () => {
      const result = await step.execute(createContext("123"));
      expect(result.textContent).toBe("一二三");
    });

    it("should preserve non-numeric characters", async () => {
      const result = await step.execute(createContext("12か34"));
      expect(result.textContent).toBe("一二か三四");
    });

    it("should preserve whitespace", async () => {
      const result = await step.execute(createContext("12 34"));
      expect(result.textContent).toBe("一二 三四");
    });

    it("should handle text with surrounding characters", async () => {
      const result = await step.execute(createContext("あ12い34"));
      expect(result.textContent).toBe("あ一二い三四");
    });

    it("should handle full-width numbers", async () => {
      const result = await step.execute(createContext("１２３"));
      expect(result.textContent).toBe("一二三");
    });

    it("should handle mixed width numbers", async () => {
      const result = await step.execute(createContext("1２3"));
      expect(result.textContent).toBe("一二三");
    });
  });
});
