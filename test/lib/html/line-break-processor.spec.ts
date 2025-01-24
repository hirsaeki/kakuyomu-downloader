import { LineBreakProcessor } from "@/lib/html/line-break-processor";
import { describe, expect, it } from "vitest";

describe("LineBreakProcessor", () => {
  const processor = new LineBreakProcessor();

  describe("process", () => {
    it("プレーンテキストの改行を<br />タグに変換すること", () => {
      const input = "これは\n改行を含む\nテキストです";
      const expected = "これは<br />\n改行を含む<br />\nテキストです";
      expect(processor.process(input)).toBe(expected);
    });

    it("タグ内のテキストノードの改行を処理すること", () => {
      const input = "<p>これは\n段落内の\n改行</p>";
      const expected = "<p>これは<br />\n段落内の<br />\n改行</p>";
      expect(processor.process(input)).toBe(expected);
    });

    it("ネストされたタグ内の改行を処理すること", () => {
      const input = "<div><p>最初の\n段落</p><p>次の\n段落</p></div>";
      const expected =
        "<div><p>最初の<br />\n段落</p><p>次の<br />\n段落</p></div>";
      expect(processor.process(input)).toBe(expected);
    });

    it("タグの属性を保持したまま改行を処理すること", () => {
      const input = '<p class="test">属性付き\nタグ</p>';
      const expected = '<p class="test">属性付き<br />\nタグ</p>';
      expect(processor.process(input)).toBe(expected);
    });

    it("改行を含まないテキストはそのまま返すこと", () => {
      const input = "<p>これは改行を含まないテキストです</p>";
      expect(processor.process(input)).toBe(input);
    });

    it("連続した改行も正しく処理すること", () => {
      const input = "<p>これは\n\n連続した\n\n改行です</p>";
      const expected =
        "<p>これは<br />\n<br />\n連続した<br />\n<br />\n改行です</p>";
      expect(processor.process(input)).toBe(expected);
    });

    it("ノードの外側の改行も正しく処理すること", () => {
      const input = "<p>これは</p>\n\n<p>段落外改行です</p>";
      const expected = "<p>これは</p><br />\n<br />\n<p>段落外改行です</p>";
      expect(processor.process(input)).toBe(expected);
    });

    it("空文字列を処理できること", () => {
      expect(processor.process("")).toBe("");
    });

    it("無効なタグを含む場合も正しく処理すること", () => {
      const input = "<invalid>これは\n無効なタグ</invalid>";
      const expected = "これは<br />\n無効なタグ"; // 無効なタグは除去される
      expect(processor.process(input)).toBe(expected);
    });
  });
});
