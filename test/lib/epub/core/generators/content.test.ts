import { describe, beforeEach, it, expect } from 'vitest';
import { ContentGenerator } from '@/lib/epub/core/generators/content';
import { setupTestDOMParser } from '../../../../utils/dom';

import JSZip from 'jszip';
import type { InputChapter } from '@/lib/epub/core/types';

describe('ContentGenerator', () => {
  let generator: ContentGenerator;
  let zip: JSZip;

  beforeEach(() => {
    setupTestDOMParser();
    generator = new ContentGenerator();
    zip = new JSZip();
  });

  describe('generateChapter', () => {
    const createChapter = (title: string, data: string): InputChapter => ({
      title,
      data,
      metadata: { groupTitle: undefined }
    });

    it('シンプルなチャプターを生成できること', async () => {
      const chapter = createChapter('テスト', '簡単なテストです。');
      const result = await generator['generateChapter'](chapter, 0, zip.folder('OEBPS')!);
      
      expect(result.title).toBe('テスト');
      expect(result.filename).toBe('chapter_001.xhtml');
    });

    it('ルビを含むテキストを適切に処理できること', async () => {
      const chapter = createChapter(
        'ルビテスト',
        '漢字《かんじ》のテスト。｜Test《テスト》です。'
      );
      const result = await generator['generateChapter'](chapter, 0, zip.folder('OEBPS')!);

      expect(result.title).toBe('ルビテスト');
      const file = await zip.folder('OEBPS')?.file(result.filename)?.async('text');
      expect(file).toContain('<ruby>漢字<rt>かんじ</rt></ruby>');
      expect(file).toContain('<ruby>Test<rt>テスト</rt></ruby>');
    });

    it('TCY（縦中横）を含むテキストを適切に処理できること', async () => {
      const chapter = createChapter(
        'TCYテスト',
        '12月34日のテスト'
      );
      const result = await generator['generateChapter'](chapter, 0, zip.folder('OEBPS')!);

      const file = await zip.folder('OEBPS')?.file(result.filename)?.async('text');
      expect(file).toContain('<span class="tcy">12</span>月');
      expect(file).toContain('<span class="tcy">34</span>日');
    });

    it('HTMLタグを含むテキストを適切に処理できること', async () => {
      const chapter = createChapter(
        'タグテスト',
        '<p>段落</p><div>ブロック</div>'
      );
      const result = await generator['generateChapter'](chapter, 0, zip.folder('OEBPS')!);

      const file = await zip.folder('OEBPS')?.file(result.filename)?.async('text');
      expect(file).toContain('<p>段落</p>');
      expect(file).toContain('<div>ブロック</div>');
    });

    it('全角スペースの処理が正しく行われること', async () => {
      const chapter = createChapter(
        'スペーステスト',
        '！　こんにちは。　？　テスト'
      );
      const result = await generator['generateChapter'](chapter, 0, zip.folder('OEBPS')!);

      const file = await zip.folder('OEBPS')?.file(result.filename)?.async('text');
      expect(file).toContain('！　こんにちは。　？　テスト');
    });

    it('複合的なパターンを正しく処理できること', async () => {
      const chapter = createChapter(
        '複合テスト',
        '平成25年の｜Test《テスト》と漢字《かんじ》と12月'
      );
      const result = await generator['generateChapter'](chapter, 0, zip.folder('OEBPS')!);

      const file = await zip.folder('OEBPS')?.file(result.filename)?.async('text');
      // 元号のパターン
      expect(file).toContain('平成二十五年');
      // ルビ
      expect(file).toContain('<ruby>Test<rt>テスト</rt></ruby>');
      expect(file).toContain('<ruby>漢字<rt>かんじ</rt></ruby>');
      // TCY
      expect(file).toContain('<span class="tcy">12</span>月');
    });

    it('エラー時に適切な例外をスローすること', async () => {
      const invalidChapter = createChapter('', '');  // 空のタイトルと内容
      await expect(() =>
        generator['generateChapter'](invalidChapter, 0, zip.folder('OEBPS')!)
      ).rejects.toThrow();
    });

    it('Typography処理後もHTMLの構造が維持されること', async () => {
      const chapter = createChapter(
        'HTML構造テスト',
        '<div class="test"><p>漢字《かんじ》</p><p>12月34日</p></div>'
      );
      const result = await generator['generateChapter'](chapter, 0, zip.folder('OEBPS')!);

      const file = await zip.folder('OEBPS')?.file(result.filename)?.async('text');
      expect(file).toContain('<div class="test">');
      expect(file).toContain('<ruby>漢字<rt>かんじ</rt></ruby>');
      expect(file).toContain('<span class="tcy">12</span>月');
      expect(file).toContain('<span class="tcy">34</span>日');
      expect(file).toMatch(/<\/p>\s*<\/div>/);  // 閉じタグの順序が正しいこと
    });

    it('特殊文字を含むテキストを適切に処理できること', async () => {
      const chapter = createChapter(
        '特殊文字テスト',
        '&lt;div&gt;エスケープされた&amp;文字&lt;/div&gt;'
      );
      const result = await generator['generateChapter'](chapter, 0, zip.folder('OEBPS')!);

      const file = await zip.folder('OEBPS')?.file(result.filename)?.async('text');
      expect(file).toContain('&lt;div&gt;');
      expect(file).toContain('&amp;');
      expect(file).toContain('&lt;/div&gt;');
    });
  });

  describe('validateChapter', () => {
    it('無効なチャプターを検出できること', () => {
      expect(() =>
        generator['validateChapter']({ title: '', data: '', metadata: { groupTitle: undefined } }, 0)
      ).toThrow();

      expect(() =>
        generator['validateChapter']({ title: 'タイトル', data: '', metadata: { groupTitle: undefined } }, 0)
      ).toThrow();
    });
  });
});