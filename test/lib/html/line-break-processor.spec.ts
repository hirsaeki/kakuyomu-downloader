import { describe, expect, it, beforeEach } from "vitest";
import { JSDOM } from "jsdom";
import { LineBreakProcessor } from "@/lib/html/line-break-processor";

describe("LineBreakProcessor", () => {
  let processor: LineBreakProcessor;
  let document: Document;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
    processor = new LineBreakProcessor();

    // DOMParserのモック
    global.DOMParser = class DOMParser {
      parseFromString(string: string, _: string) {
        return new JSDOM(string).window.document;
      }
    } as any;
  });

  describe("insertLineBreaks", () => {
    it("プレーンテキストの改行を<br>タグに変換すること", () => {
      const div = document.createElement('div');
      div.textContent = "これは\n改行を含む\nテキストです";
      
      processor.insertLineBreaks(div);
      
      // textContentではなくinnerHTMLを使用して<br>タグを確認
      expect(div.innerHTML).toBe("これは<br>改行を含む<br>テキストです");
    });

    it("複数のテキストノードの改行を処理すること", () => {
      const div = document.createElement('div');
      const p1 = document.createElement('p');
      const p2 = document.createElement('p');
      
      p1.textContent = "最初の\n段落";
      p2.textContent = "次の\n段落";
      div.appendChild(p1);
      div.appendChild(p2);

      processor.insertLineBreaks(div);

      expect(div.innerHTML).toBe("<p>最初の<br>段落</p><p>次の<br>段落</p>");
    });

    it("ネストされたタグ内の改行を処理すること", () => {
      const div = document.createElement('div');
      div.innerHTML = "<span>これは\nネストされた\nテキスト</span>";

      processor.insertLineBreaks(div);

      expect(div.innerHTML).toBe("<span>これは<br>ネストされた<br>テキスト</span>");
    });

    it("属性を持つタグ内の改行を処理すること", () => {
      const div = document.createElement('div');
      const p = document.createElement('p');
      p.setAttribute('class', 'test');
      p.textContent = "属性付き\nタグ";
      div.appendChild(p);

      processor.insertLineBreaks(div);

      expect(div.innerHTML).toBe('<p class="test">属性付き<br>タグ</p>');
    });

    it("改行を含まないテキストはそのまま返すこと", () => {
      const div = document.createElement('div');
      div.textContent = "これは改行を含まないテキストです";

      processor.insertLineBreaks(div);

      expect(div.innerHTML).toBe("これは改行を含まないテキストです");
    });

    it("連続した改行も正しく処理すること", () => {
      const div = document.createElement('div');
      div.textContent = "これは\n\n連続した\n\n改行です";

      processor.insertLineBreaks(div);

      expect(div.innerHTML).toBe("これは<br><br>連続した<br><br>改行です");
    });

    it("タグの間の改行も正しく処理すること", () => {
      const div = document.createElement('div');
      div.innerHTML = "<p>最初</p>\n\n<p>次</p>";

      processor.insertLineBreaks(div);

      expect(div.innerHTML).toBe("<p>最初</p><br><br><p>次</p>");
    });

    it("空のDOM要素を処理できること", () => {
      const div = document.createElement('div');

      processor.insertLineBreaks(div);

      expect(div.innerHTML).toBe("");
    });

    it("エラー時は例外をスローすること", () => {
      const div = null as any;

      expect(() => {
        processor.insertLineBreaks(div);
      }).toThrow();
    });
  });
});