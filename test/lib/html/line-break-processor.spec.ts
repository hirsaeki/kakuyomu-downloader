import { describe, it, expect } from 'vitest';
import { LineBreakProcessor } from '@/lib/html/line-break-processor';

describe('LineBreakProcessor', () => {
  const processor = new LineBreakProcessor();

  describe('process', () => {
    it('改行コードを<br />タグに変換すること', () => {
      const input = 'これは\n改行を含む\nテキストです';
      const expected = 'これは<br />\n改行を含む<br />\nテキストです';
      expect(processor.process(input)).toBe(expected);
    });

    it('改行を含まないテキストはそのまま返すこと', () => {
      const input = 'これは改行を含まないテキストです';
      expect(processor.process(input)).toBe(input);
    });

    it('連続した改行も正しく処理すること', () => {
      const input = 'これは\n\n連続した\n\n改行です';
      const expected = 'これは<br />\n<br />\n連続した<br />\n<br />\n改行です';
      expect(processor.process(input)).toBe(expected);
    });

    it('空文字列を処理できること', () => {
      expect(processor.process('')).toBe('');
    });
  });
});