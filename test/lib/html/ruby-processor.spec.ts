import { RubyProcessor } from "@/lib/html/ruby-processor";
import { beforeEach, describe, expect, it } from "vitest";
import { setupTestDOMParser } from "../../utils/dom";

describe("RubyProcessor", () => {
  let processor: RubyProcessor;

  beforeEach(() => {
    processor = new RubyProcessor();
    setupTestDOMParser();
  });

  describe("fromAozoraRuby", () => {
    it("漢字のみのルビを変換できること", () => {
      const input = "漢字《かんじ》のテスト";
      const result = processor.fromAozoraRuby(input);
      expect(result).toBe("<ruby>漢字<rt>かんじ</rt></ruby>のテスト");
    });

    it("｜付きのルビを変換できること", () => {
      const input = "｜アルファ《α》と｜ベータ《β》";
      const result = processor.fromAozoraRuby(input);
      expect(result).toBe(
        "<ruby>アルファ<rt>α</rt></ruby>と<ruby>ベータ<rt>β</rt></ruby>"
      );
    });

    it("漢字と非漢字が混在する場合も適切に変換すること", () => {
      const input = "漢字《かんじ》と｜Type《タイプ》";
      const result = processor.fromAozoraRuby(input);
      expect(result).toBe(
        "<ruby>漢字<rt>かんじ</rt></ruby>と<ruby>Type<rt>タイプ</rt></ruby>"
      );
    });

    it("複数のルビが含まれるテキストを処理すること", () => {
      const input = "日本《にほん》の文化《ぶんか》";
      const result = processor.fromAozoraRuby(input);
      expect(result).toBe(
        "<ruby>日本<rt>にほん</rt></ruby>の<ruby>文化<rt>ぶんか</rt></ruby>"
      );
    });

    it("ルビがないテキストはそのまま返すこと", () => {
      const text = "ルビのないテキスト";
      const result = processor.fromAozoraRuby(text);
      expect(result).toBe(text);
    });

    it("空のテキストを処理できること", () => {
      const result = processor.fromAozoraRuby("");
      expect(result).toBe("");
    });

    it("エラー時は例外をスローすること", () => {
      expect(() => {
        processor.fromAozoraRuby(null as any);
      }).toThrow();
    });
  });

  describe("toAozoraRuby", () => {
    it("XHTMLルビタグを青空文庫形式に変換できること", () => {
      const input = "<ruby>漢字<rt>かんじ</rt></ruby>のテスト";
      const expected = "漢字《かんじ》のテスト";
      expect(processor.toAozoraRuby(input)).toBe(expected);
    });

    it("漢字以外の文字には｜を付けること", () => {
      const input =
        "<ruby>アルファ<rt>α</rt></ruby>と<ruby>ベータ<rt>β</rt></ruby>";
      const expected = "｜アルファ《α》と｜ベータ《β》";
      expect(processor.toAozoraRuby(input)).toBe(expected);
    });

    it("不要なタグを除去すること", () => {
      const input = "<ruby><rb>漢字</rb><rt>かんじ</rt><rtc>かん字</rtc></ruby>";
      const expected = "漢字《かんじ》";
      expect(processor.toAozoraRuby(input)).toBe(expected);
    });
  });

  describe("変換の一貫性", () => {
    it("青空文庫形式とXHTMLの相互変換で結果が一致すること", () => {
      const testCases = [
        "漢字《かんじ》のテスト",
        "｜アルファ《α》と｜ベータ《β》",
        "日本《にほん》の文化《ぶんか》"
      ];

      testCases.forEach(input => {
        // 青空文庫 → XHTML → 青空文庫
        const toXHTML = processor.fromAozoraRuby(input);
        const backToAozora = processor.toAozoraRuby(toXHTML);
        expect(backToAozora).toBe(input);

        // XHTML → 青空文庫 → XHTML
        const xhtmlInput = processor.fromAozoraRuby(input);
        const toAozora = processor.toAozoraRuby(xhtmlInput);
        const backToXHTML = processor.fromAozoraRuby(toAozora);
        expect(backToXHTML).toBe(xhtmlInput);
      });
    });
  });
});