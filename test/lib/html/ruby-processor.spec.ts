import { RubyProcessor } from '@/lib/html/ruby-processor';
import { JSDOM } from 'jsdom';
import { beforeEach, describe, expect, it } from 'vitest';
import { setupTestDOMParser } from '../../utils/dom';

describe('RubyProcessor', () => {
  let processor: RubyProcessor;
  let document: Document;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
    processor = new RubyProcessor();
    setupTestDOMParser();
  });

  describe('fromAozoraRuby', () => {
    it('漢字のみのルビを変換できること', () => {
      const div = document.createElement('div');
      div.textContent = '漢字《かんじ》のテスト';

      processor.fromAozoraRuby(div);
      expect(div.innerHTML).toBe('<ruby>漢字<rt>かんじ</rt></ruby>のテスト');
    });

    it('｜付きのルビを変換できること', () => {
      const div = document.createElement('div');
      div.textContent = '｜アルファ《α》と｜ベータ《β》';

      processor.fromAozoraRuby(div);
      expect(div.innerHTML).toBe(
        '<ruby>アルファ<rt>α</rt></ruby>と<ruby>ベータ<rt>β</rt></ruby>'
      );
    });

    it('漢字と非漢字が混在する場合も適切に変換すること', () => {
      const div = document.createElement('div');
      div.textContent = '漢字《かんじ》と｜Type《タイプ》';

      processor.fromAozoraRuby(div);
      expect(div.innerHTML).toBe(
        '<ruby>漢字<rt>かんじ</rt></ruby>と<ruby>Type<rt>タイプ</rt></ruby>'
      );
    });

    it('ネストされたタグ内のルビも処理すること', () => {
      const div = document.createElement('div');
      div.innerHTML = '<p>これは<span>漢字《かんじ》</span>です</p>';

      processor.fromAozoraRuby(div);
      expect(div.innerHTML).toBe(
        '<p>これは<span><ruby>漢字<rt>かんじ</rt></ruby></span>です</p>'
      );
    });

    it('属性を持つタグ内のルビを処理すること', () => {
      const div = document.createElement('div');
      const p = document.createElement('p');
      p.setAttribute('class', 'test');
      p.textContent = '漢字《かんじ》の例';
      div.appendChild(p);

      processor.fromAozoraRuby(div);
      expect(div.innerHTML).toBe(
        '<p class="test"><ruby>漢字<rt>かんじ</rt></ruby>の例</p>'
      );
    });

    it('複数のルビが含まれるテキストを処理すること', () => {
      const div = document.createElement('div');
      div.textContent = '日本《にほん》の文化《ぶんか》';

      processor.fromAozoraRuby(div);
      expect(div.innerHTML).toBe(
        '<ruby>日本<rt>にほん</rt></ruby>の<ruby>文化<rt>ぶんか</rt></ruby>'
      );
    });

    it('ルビがないテキストはそのまま返すこと', () => {
      const div = document.createElement('div');
      const text = 'ルビのないテキスト';
      div.textContent = text;

      processor.fromAozoraRuby(div);
      expect(div.innerHTML).toBe(text);
    });

    it('空のDOM要素を処理できること', () => {
      const div = document.createElement('div');

      processor.fromAozoraRuby(div);
      expect(div.innerHTML).toBe('');
    });

    it('エラー時は例外をスローすること', () => {
      const div = null as any;

      expect(() => {
        processor.fromAozoraRuby(div);
      }).toThrow();
    });
  });

  describe('toAozoraRuby', () => {
    it('XHTMLルビタグを青空文庫形式に変換できること', () => {
      const input = '<ruby>漢字<rt>かんじ</rt></ruby>のテスト';
      const expected = '漢字《かんじ》のテスト';
      expect(processor.toAozoraRuby(input)).toBe(expected);
    });

    it('漢字以外の文字には｜を付けること', () => {
      const input = '<ruby>アルファ<rt>α</rt></ruby>と<ruby>ベータ<rt>β</rt></ruby>';
      const expected = '｜アルファ《α》と｜ベータ《β》';
      expect(processor.toAozoraRuby(input)).toBe(expected);
    });

    it('不要なタグを除去すること', () => {
      const input = '<ruby><rb>漢字</rb><rt>かんじ</rt><rtc>かん字</rtc></ruby>';
      const expected = '漢字《かんじ》';
      expect(processor.toAozoraRuby(input)).toBe(expected);
    });
  });
});