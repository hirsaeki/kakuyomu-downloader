import { describe, it, expect } from 'vitest';
import { RubyProcessor } from '@/lib/html/ruby-processor';

describe('RubyProcessor', () => {
  const processor = new RubyProcessor();

  describe('toAozoraRuby', () => {
    it('基本的なXHTMLルビタグを青空文庫形式に変換できること', () => {
      const input = '<ruby>漢字<rt>かんじ</rt></ruby>のテスト';
      const expected = '｜漢字《かんじ》のテスト';
      expect(processor.toAozoraRuby(input)).toBe(expected);
    });

    it('複数のルビタグを変換できること', () => {
      const input = '<ruby>日本<rt>にほん</rt></ruby>の<ruby>文化<rt>ぶんか</rt></ruby>';
      const expected = '｜日本《にほん》の｜文化《ぶんか》';
      expect(processor.toAozoraRuby(input)).toBe(expected);
    });

    it('rpタグを含むルビも処理できること', () => {
      const input = '<ruby>漢字<rt>かんじ</rt><rp>（</rp><rp>）</rp></ruby>';
      const expected = '｜漢字《かんじ》';
      expect(processor.toAozoraRuby(input)).toBe(expected);
    });
  });

  describe('fromAozoraRuby', () => {
    it('基本的な青空文庫形式をXHTMLルビタグに変換できること', () => {
      const input = '｜漢字《かんじ》のテスト';
      const expected = '<ruby>漢字<rt>かんじ</rt><rp>（</rp><rp>）</rp></ruby>のテスト';
      expect(processor.fromAozoraRuby(input)).toBe(expected);
    });

    it('複数のルビを変換できること', () => {
      const input = '｜日本《にほん》の｜文化《ぶんか》';
      const expected = '<ruby>日本<rt>にほん</rt><rp>（</rp><rp>）</rp></ruby>の<ruby>文化<rt>ぶんか</rt><rp>（</rp><rp>）</rp></ruby>';
      expect(processor.fromAozoraRuby(input)).toBe(expected);
    });

    it('ルビが含まれていないテキストはそのまま返すこと', () => {
      const input = 'ルビのないテキスト';
      expect(processor.fromAozoraRuby(input)).toBe(input);
    });
  });

  describe('双方向変換の一貫性', () => {
    it('XHTMLから青空文庫形式に変換し、再度XHTMLに戻した結果が等価であること', () => {
      const original = '<ruby>漢字<rt>かんじ</rt></ruby>のテスト';
      const aozora = processor.toAozoraRuby(original);
      const backToXhtml = processor.fromAozoraRuby(aozora);
      // rpタグは変換時に追加されるため、完全な一致ではなく、意味的な等価性をテスト
      expect(backToXhtml).toContain('<ruby>漢字<rt>かんじ</rt>');
      expect(backToXhtml).toContain('のテスト');
    });
  });

  describe('スタティックメソッド', () => {
    it('静的メソッドでもインスタンスメソッドと同じ結果が得られること', () => {
      const input = '<ruby>漢字<rt>かんじ</rt></ruby>';
      expect(RubyProcessor.toAozoraRuby(input))
        .toBe(processor.toAozoraRuby(input));
      
      const aozoraInput = '｜漢字《かんじ》';
      expect(RubyProcessor.fromAozoraRuby(aozoraInput))
        .toBe(processor.fromAozoraRuby(aozoraInput));
    });
  });
});