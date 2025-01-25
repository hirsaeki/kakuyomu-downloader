import { EmphasisProcessor } from "@/lib/html/emphasis-processor";
import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, it } from "vitest";

describe("EmphasisProcessor", () => {
  let processor: EmphasisProcessor;
  let document: Document;

  beforeEach(() => {
    const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    document = dom.window.document;
    processor = new EmphasisProcessor();

    global.DOMParser = class DOMParser {
      parseFromString(string: string, _: string) {
        return new JSDOM(string).window.document;
      }
    } as any;
  });

  describe("fromEmphasisNotation", () => {
    it("基本的な独自記法をXHTML傍点タグに変換できること", () => {
      const div = document.createElement("div");
      div.textContent = "《《加入条件》》";

      processor.fromEmphasisNotation(div);

      expect(div.innerHTML).toBe(
        '<em class="emphasisDots"><span>加</span><span>入</span><span>条</span><span>件</span></em>'
      );
    });

    it("複数の傍点記法を変換できること", () => {
      const div = document.createElement("div");
      div.textContent = "《《加入》》の《《条件》》";

      processor.fromEmphasisNotation(div);

      expect(div.innerHTML).toBe(
        '<em class="emphasisDots"><span>加</span><span>入</span></em>の<em class="emphasisDots"><span>条</span><span>件</span></em>'
      );
    });

    it("傍点記法が含まれていないテキストはそのまま返すこと", () => {
      const div = document.createElement("div");
      const text = "傍点のないテキスト";
      div.textContent = text;

      processor.fromEmphasisNotation(div);

      expect(div.innerHTML).toBe(text);
    });

    it("他のテキストと混在しても正しく変換できること", () => {
      const div = document.createElement("div");
      div.textContent = "重要な《《必須》》項目です。";

      processor.fromEmphasisNotation(div);

      expect(div.innerHTML).toBe(
        '重要な<em class="emphasisDots"><span>必</span><span>須</span></em>項目です。'
      );
    });

    it("ネストされたタグ内の傍点記法を処理すること", () => {
      const div = document.createElement("div");
      div.innerHTML = "<p>これは<span>《《重要》》</span>です</p>";

      processor.fromEmphasisNotation(div);

      expect(div.innerHTML).toBe(
        '<p>これは<span><em class="emphasisDots"><span>重</span><span>要</span></em></span>です</p>'
      );
    });

    it("属性を持つタグ内の傍点記法を処理すること", () => {
      const div = document.createElement("div");
      const p = document.createElement("p");
      p.setAttribute("class", "test");
      p.textContent = "《《重要》》な部分";
      div.appendChild(p);

      processor.fromEmphasisNotation(div);

      expect(div.innerHTML).toBe(
        '<p class="test"><em class="emphasisDots"><span>重</span><span>要</span></em>な部分</p>'
      );
    });

    it("空のDOM要素を処理できること", () => {
      const div = document.createElement("div");

      processor.fromEmphasisNotation(div);

      expect(div.innerHTML).toBe("");
    });

    it("エラー時は例外をスローすること", () => {
      const div = null as any;

      expect(() => {
        processor.fromEmphasisNotation(div);
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
    it("DOMベースの変換とテキストベースの変換で結果が一致すること", () => {
      const testCases = [
        "《《加入条件》》",
        "重要な《《必須》》項目です",
        "《《加入》》の《《条件》》",
      ];

      testCases.forEach((input) => {
        const div = document.createElement("div");
        div.textContent = input;

        // DOMベースの変換
        processor.fromEmphasisNotation(div);
        const domResult = div.innerHTML;

        // テキストベースの変換
        const textResult = processor.fromEmphasisNotation(input);

        expect(domResult).toBe(textResult);
      });
    });
  });
});
