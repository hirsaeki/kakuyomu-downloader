import { describe, it, expect } from 'vitest';
import { EmphasisProcessor } from '@/lib/html/emphasis-processor';

describe('EmphasisProcessor', () => {
  const processor = new EmphasisProcessor();

  describe('toEmphasisNotation', () => {
    it('基本的なXHTML傍点タグを独自記法に変換できること', () => {
      const input = '<em class="emphasisDots"><span>加</span><span>入</span><span>条</span><span>件</span></em>';
      const expected = '《《加入条件》》';
      expect(processor.toEmphasisNotation(input)).toBe(expected);
    });

    it('複数の傍点を持つテキストを変換できること', () => {
      const input = '<em class="emphasisDots"><span>加</span><span>入</span></em>の<em class="emphasisDots"><span>条</span><span>件</span></em>';
      const expected = '《《加入》》の《《条件》》';
      expect(processor.toEmphasisNotation(input)).toBe(expected);
    });

    it('他のテキストと混在しても正しく変換できること', () => {
      const input = '重要な<em class="emphasisDots"><span>必</span><span>須</span></em>項目です。';
      const expected = '重要な《《必須》》項目です。';
      expect(processor.toEmphasisNotation(input)).toBe(expected);
    });
  });

  describe('fromEmphasisNotation', () => {
    it('基本的な独自記法をXHTML傍点タグに変換できること', () => {
      const input = '《《加入条件》》';
      const expected = '<em class="emphasisDots"><span>加</span><span>入</span><span>条</span><span>件</span></em>';
      expect(processor.fromEmphasisNotation(input)).toBe(expected);
    });

    it('複数の傍点記法を変換できること', () => {
      const input = '《《加入》》の《《条件》》';
      const expected = '<em class="emphasisDots"><span>加</span><span>入</span></em>の<em class="emphasisDots"><span>条</span><span>件</span></em>';
      expect(processor.fromEmphasisNotation(input)).toBe(expected);
    });

    it('傍点記法が含まれていないテキストはそのまま返すこと', () => {
      const input = '傍点のないテキスト';
      expect(processor.fromEmphasisNotation(input)).toBe(input);
    });

    it('他のテキストと混在しても正しく変換できること', () => {
      const input = '重要な《《必須》》項目です。';
      const expected = '重要な<em class="emphasisDots"><span>必</span><span>須</span></em>項目です。';
      expect(processor.fromEmphasisNotation(input)).toBe(expected);
    });
  });

  describe('双方向変換の一貫性', () => {
    it('XHTMLから独自記法に変換し、再度XHTMLに戻した結果が等価であること', () => {
      const testCases = [
        '<em class="emphasisDots"><span>加</span><span>入</span><span>条</span><span>件</span></em>',
        '重要な<em class="emphasisDots"><span>必</span><span>須</span></em>項目です',
        '<em class="emphasisDots"><span>加</span><span>入</span></em>の<em class="emphasisDots"><span>条</span><span>件</span></em>'
      ];

      testCases.forEach(original => {
        const notation = processor.toEmphasisNotation(original);
        const backToXhtml = processor.fromEmphasisNotation(notation);
        expect(backToXhtml).toBe(original);
      });
    });
  });

  describe('スタティックメソッド', () => {
    const testCases = [
      {
        html: '<em class="emphasisDots"><span>加</span><span>入</span></em>',
        notation: '《《加入》》'
      },
      {
        html: '重要な<em class="emphasisDots"><span>必</span><span>須</span></em>項目',
        notation: '重要な《《必須》》項目'
      }
    ];

    it('静的メソッドでもインスタンスメソッドと同じ結果が得られること', () => {
      testCases.forEach(({ html, notation }) => {
        // XHTML -> 独自記法
        expect(EmphasisProcessor.toEmphasisNotation(html)).toBe(notation);
        expect(EmphasisProcessor.toEmphasisNotation(html)).toBe(processor.toEmphasisNotation(html));

        // 独自記法 -> XHTML
        const expectedHtml = processor.fromEmphasisNotation(notation);
        expect(EmphasisProcessor.fromEmphasisNotation(notation)).toBe(expectedHtml);
      });
    });
  });
});