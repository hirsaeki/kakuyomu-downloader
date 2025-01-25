import { LineBreakProcessor } from "@/lib/html/line-break-processor";
import { beforeEach, describe, expect, it } from "vitest";
import { setupTestDOMParser } from "../../utils/dom";

describe("LineBreakProcessor", () => {
  let processor: LineBreakProcessor;

  beforeEach(() => {
    processor = new LineBreakProcessor();
    setupTestDOMParser();
  });

  describe("insertLineBreaks", () => {
    it("プレーンテキストの改行を<br />\\nに変換すること", () => {
      const div = document.createElement("div");
      div.textContent = "これは\n改行を含む\nテキストです";

      processor.insertLineBreaks(div);

      expect(div.innerHTML).toBe("これは<br>\n改行を含む<br>\nテキストです");
    });

    it("複数のテキストノードの改行を処理すること", () => {
      const div = document.createElement("div");
      const p1 = document.createElement("p");
      const p2 = document.createElement("p");

      p1.textContent = "最初の\n段落";
      p2.textContent = "次の\n段落";
      div.appendChild(p1);
      div.appendChild(p2);

      processor.insertLineBreaks(div);

      expect(div.innerHTML).toBe(
        "<p>最初の<br>\n段落</p><p>次の<br>\n段落</p>"
      );
    });

    it("ネストされたタグ内の改行を処理すること", () => {
      const div = document.createElement("div");
      div.innerHTML = "<span>これは\nネストされた\nテキスト</span>";

      processor.insertLineBreaks(div);

      expect(div.innerHTML).toBe(
        "<span>これは<br>\nネストされた<br>\nテキスト</span>"
      );
    });

    it("属性を持つタグ内の改行を処理すること", () => {
      const div = document.createElement("div");
      const p = document.createElement("p");
      p.setAttribute("class", "test");
      p.textContent = "属性付き\nタグ";
      div.appendChild(p);

      processor.insertLineBreaks(div);

      expect(div.innerHTML).toBe('<p class="test">属性付き<br>\nタグ</p>');
    });

    it("改行を含まないテキストはそのまま返すこと", () => {
      const div = document.createElement("div");
      div.textContent = "これは改行を含まないテキストです";

      processor.insertLineBreaks(div);

      expect(div.innerHTML).toBe("これは改行を含まないテキストです");
    });

    it("連続した改行も正しく処理すること", () => {
      const div = document.createElement("div");
      div.textContent = "これは\n\n連続した\n\n改行です";

      processor.insertLineBreaks(div);

      expect(div.innerHTML).toBe(
        "これは<br>\n<br>\n連続した<br>\n<br>\n改行です"
      );
    });

    it("タグの間の改行も正しく処理すること", () => {
      const div = document.createElement("div");
      div.innerHTML = "<p>最初</p>\n\n<p>次</p>";

      processor.insertLineBreaks(div);

      expect(div.innerHTML).toBe("<p>最初</p><br>\n<br>\n<p>次</p>");
    });

    it("空のDOM要素を処理できること", () => {
      const div = document.createElement("div");

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
