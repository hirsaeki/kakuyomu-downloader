import { EmphasisProcessor } from "@/lib/html/emphasis-processor";
import { beforeEach, describe, expect, it } from "vitest";
import { setupTestDOMParser } from "../../utils/dom";

describe("EmphasisProcessor", () => {
  let processor: EmphasisProcessor;

  beforeEach(() => {
    processor = new EmphasisProcessor();
    setupTestDOMParser();
  });

  describe("fromEmphasisNotation", () => {
    it("基本的な独自記法をXHTML傍点タグに変換できること", () => {
      const input = "《《加入条件》》";
      const result = processor.fromEmphasisNotation(input);
      
      expect(result).toBe(
        '<em class="emphasisDots"><span>加</span><span>入</span><span>条</span><span>件</span></em>'
      );
    });

    it("複数の傍点記法を変換できること", () => {
      const input = "《《加入》》の《《条件》》";
      const result = processor.fromEmphasisNotation(input);
      
      expect(result).toBe(
        '<em class="emphasisDots"><span>加</span><span>入</span></em>の<em class="emphasisDots"><span>条</span><span>件</span></em>'
      );
    });

    it("傍点記法が含まれていないテキストはそのまま返すこと", () => {
      const text = "傍点のないテキスト";
      const result = processor.fromEmphasisNotation(text);
      
      expect(result).toBe(text);
    });

    it("他のテキストと混在しても正しく変換できること", () => {
      const input = "重要な《《必須》》項目です。";
      const result = processor.fromEmphasisNotation(input);
      
      expect(result).toBe(
        '重要な<em class="emphasisDots"><span>必</span><span>須</span></em>項目です。'
      );
    });

    it("エラー時は例外をスローすること", () => {
      expect(() => {
        processor.fromEmphasisNotation(null as any);
      }).toThrow();
    });
  });

  describe("toEmphasisNotation", () => {
    it("基本的なXHTML傍点タグを独自記法に変換できること", () => {
      const input =
        '<em class="emphasisDots"><span>加</span><span>入</span><span>条</span><span>件</span></em>';
      const expected = "《《加入条件》》";
      expect(processor.toEmphasisNotation(input)).toBe(expected);
    });

    it("複数の傍点を持つテキストを変換できること", () => {
      const input =
        '<em class="emphasisDots"><span>加</span><span>入</span></em>の<em class="emphasisDots"><span>条</span><span>件</span></em>';
      const expected = "《《加入》》の《《条件》》";
      expect(processor.toEmphasisNotation(input)).toBe(expected);
    });

    it("他のテキストと混在しても正しく変換できること", () => {
      const input =
        '重要な<em class="emphasisDots"><span>必</span><span>須</span></em>項目です。';
      const expected = "重要な《《必須》》項目です。";
      expect(processor.toEmphasisNotation(input)).toBe(expected);
    });
  });

  describe("変換の一貫性", () => {
    it("XHTMLと独自記法の相互変換で結果が一致すること", () => {
      const testCases = [
        "《《加入条件》》",
        "重要な《《必須》》項目です",
        "《《加入》》の《《条件》》",
      ];

      testCases.forEach((input) => {
        // 独自記法 → XHTML → 独自記法
        const toXHTML = processor.fromEmphasisNotation(input);
        const backToNotation = processor.toEmphasisNotation(toXHTML);
        expect(backToNotation).toBe(input);

        // XHTML → 独自記法 → XHTML
        const xhtmlInput = processor.fromEmphasisNotation(input);
        const toNotation = processor.toEmphasisNotation(xhtmlInput);
        const backToXHTML = processor.fromEmphasisNotation(toNotation);
        expect(backToXHTML).toBe(xhtmlInput);
      });
    });
  });
});