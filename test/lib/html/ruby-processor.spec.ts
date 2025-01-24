import { describe, it, expect } from 'vitest';
import { RubyProcessor } from '@/lib/html/ruby-processor';

describe('RubyProcessor', () => {
  const processor = new RubyProcessor();

  describe('toAozoraRuby', () => {
    it('漢字のみの場合は｜を省略すること', () => {
      const input = '<ruby>漢字<rt>かんじ</rt></ruby>のテスト';
      const expected = '漢字《かんじ》のテスト';
      expect(processor.toAozoraRuby(input)).toBe(expected);
    });

    it('漢字以外の文字には｜を付けること', () => {
      const input = '<ruby>アルファ<rt>α</rt></ruby>と<ruby>ベータ<rt>β</rt></ruby>';
      const expected = '｜アルファ《α》と｜ベータ《β》';
      expect(processor.toAozoraRuby(input)).toBe(expected);
    });

    it('漢字と非漢字が混在する場合は適切に｜を制御すること', () => {
      const input = '<ruby>漢字<rt>かんじ</rt></ruby>と<ruby>Type<rt>タイプ</rt></ruby>';
      const expected = '漢字《かんじ》と｜Type《タイプ》';
      expect(processor.toAozoraRuby(input)).toBe(expected);
    });

    it('rbタグやrtcタグが含まれる場合も適切に処理すること', () => {
      const input = '<ruby><rb>漢字</rb><rt>かんじ</rt><rtc>かん字</rtc></ruby>';
      const expected = '漢字《かんじ》';
      expect(processor.toAozoraRuby(input)).toBe(expected);
    });

    it('複数のルビタグを変換できること', () => {
      const input = '<ruby>日本<rt>にほん</rt></ruby>の<ruby>文化<rt>ぶんか</rt></ruby>';
      const expected = '日本《にほん》の文化《ぶんか》';
      expect(processor.toAozoraRuby(input)).toBe(expected);
    });
  });

  describe('fromAozoraRuby', () => {
    it('｜付きの青空文庫形式を変換できること', () => {
      const input = '｜アルファ《α》';
      const expected = '<ruby>アルファ<rt>α</rt></ruby>';
      expect(processor.fromAozoraRuby(input)).toBe(expected);
    });

    it('漢字のみの場合は｜なしでも変換できること', () => {
      const input = '漢字《かんじ》';
      const expected = '<ruby>漢字<rt>かんじ</rt></ruby>';
      expect(processor.fromAozoraRuby(input)).toBe(expected);
    });

    it('｜付きと漢字のみのパターンが混在する場合も変換できること', () => {
      const input = '漢字《かんじ》と｜Type《タイプ》';
      const expected = '<ruby>漢字<rt>かんじ</rt></ruby>と<ruby>Type<rt>タイプ</rt></ruby>';
      expect(processor.fromAozoraRuby(input)).toBe(expected);
    });


    it('ルビが含まれていないテキストはそのまま返すこと', () => {
      const input = 'ルビのないテキスト';
      expect(processor.fromAozoraRuby(input)).toBe(input);
    });
  });

  describe('双方向変換の一貫性', () => {
    it('XHTMLから青空文庫形式に変換し、再度XHTMLに戻した結果が等価であること', () => {
      const testCases = [
        '<ruby>漢字<rt>かんじ</rt></ruby>のテスト',
        '<ruby>Type<rt>タイプ</rt></ruby>システム',
        '<ruby>日本<rt>にほん</rt></ruby>の<ruby>文化<rt>ぶんか</rt></ruby>',
        '<ruby><rb>漢字</rb><rt>かんじ</rt><rtc>かん字</rtc></ruby>'
      ];

      testCases.forEach(original => {
        const aozora = processor.toAozoraRuby(original);
        const backToXhtml = processor.fromAozoraRuby(aozora);
        const normalized = original
          .replace(/<rb>|<\/rb>|<rtc>.*?<\/rtc>/g, '')  // rbタグとrtcタグを除去
          .replace(/<rp>.*?<\/rp>/g, '');  // rpタグを除去

        expect(backToXhtml).toBe(normalized);
      });
    });
  });

  describe('スタティックメソッド', () => {
    const testCases = [
      // 漢字のみ
      {
        html: '<ruby>漢字<rt>かんじ</rt></ruby>',
        aozora: '漢字《かんじ》'
      },
      // 非漢字
      {
        html: '<ruby>Type<rt>タイプ</rt></ruby>',
        aozora: '｜Type《タイプ》'
      },
      // 複合パターン
      {
        html: '<ruby>漢字<rt>かんじ</rt></ruby>と<ruby>Type<rt>タイプ</rt></ruby>',
        aozora: '漢字《かんじ》と｜Type《タイプ》'
      }
    ];

    it('静的メソッドでもインスタンスメソッドと同じ結果が得られること', () => {
      testCases.forEach(({ html, aozora }) => {
        // XHTML -> 青空文庫
        expect(RubyProcessor.toAozoraRuby(html)).toBe(aozora);
        expect(RubyProcessor.toAozoraRuby(html)).toBe(processor.toAozoraRuby(html));

        // 青空文庫 -> XHTML
        const expectedHtml = processor.fromAozoraRuby(aozora);
        expect(RubyProcessor.fromAozoraRuby(aozora)).toBe(expectedHtml);
      });
    });
  });
});