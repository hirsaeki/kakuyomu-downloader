import { describe, it, expect } from 'vitest';
import { ParagraphProcessor } from '@/lib/html/paragraph-processor';

describe('ParagraphProcessor', () => {
  const processor = new ParagraphProcessor();

  describe('HTMLからの変換', () => {
    it('HTMLタグを含むテキストから純粋なテキストを抽出すること', () => {
      const input = '<div><em>強調</em>テキスト</div>';
      const expected = '<p>強調テキスト</p>';
      expect(processor.process(input)).toBe(expected);
    });

    it('入れ子になったHTMLから意味のある空行を保持して変換すること', () => {
      const input = `
        <div class="content">
          <p>最初の段落</p>


          <p>これは空行で区切られた段落</p>
        </div>
      `;
      const expected = '<p>最初の段落</p>\n\n<p>これは空行で区切られた段落</p>';
      expect(processor.process(input)).toBe(expected);
    });

    it('HTMLタグは単なるテキストとして扱われること', () => {
      const input = `
        <div>
          テキスト<br>with<br />改行
        </div>
      `;
      // textContentにより空白は保持されず、brタグはテキストとして扱われる
      const expected = '<p>テキストwith改行</p>';
      expect(processor.process(input)).toBe(expected);
    });
  });

  describe('段落処理', () => {
    it('テキストに空行がない場合は単一の段落として処理すること', () => {
      const input = 'Line 1\nLine 2\nLine 3';
      const expected = '<p>Line 1\nLine 2\nLine 3</p>';
      expect(processor.process(input)).toBe(expected);
    });

    it('テキストに十分な空行がある場合は複数の段落に分割すること', () => {
      const input = '最初の段落\n\n\n次の段落';  // 2つの空行
      const expected = '<p>最初の段落</p>\n\n<p>次の段落</p>';
      expect(processor.process(input)).toBe(expected);
    });

    it('空行が閾値未満の場合は段落を分割せず、単一の改行として扱うこと', () => {
      const input = '最初の行\n\n次の行';  // 1つの空行
      // 閾値未満の空行は単一の改行として扱われる
      const expected = '<p>最初の行\n次の行</p>';
      expect(processor.process(input)).toBe(expected);
    });
  });

  describe('オプション設定', () => {
    it('minEmptyLinesオプションで段落分割の閾値を変更できること', () => {
      const customProcessor = new ParagraphProcessor({ minEmptyLines: 3 });
      // 2つの空行では分割されず、単一の改行として扱われる
      const input = '最初の段落\n\n\n次の段落';  // 2つの空行
      const expected = '<p>最初の段落\n次の段落</p>';
      expect(customProcessor.process(input)).toBe(expected);

      // 3つの空行では分割される
      const input2 = '最初の段落\n\n\n\n次の段落';  // 3つの空行
      const expected2 = '<p>最初の段落</p>\n\n<p>次の段落</p>';
      expect(customProcessor.process(input2)).toBe(expected2);
    });
  });

  describe('エッジケース', () => {
    it('空のテキストは空のまま返すこと', () => {
      expect(processor.process('')).toBe('');
    });

    it('空白文字のみのテキストは空のまま返すこと', () => {
      expect(processor.process('   \n   \n   ')).toBe('');
    });

    it('CRLFとLFが混在する入力を正規化して処理すること', () => {
      const input = 'First\r\nSecond\nThird';
      const expected = '<p>First\nSecond\nThird</p>';
      expect(processor.process(input)).toBe(expected);
    });

    it('前後の空白を適切に除去すること', () => {
      const input = '  \n  テスト  \n  ';
      const expected = '<p>テスト</p>';
      expect(processor.process(input)).toBe(expected);
    });
  });
});