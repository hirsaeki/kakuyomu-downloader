import { describe, it, expect } from 'vitest';
import { TcyConverter } from '@/lib/html/tcy-converter';

describe('TcyConverter', () => {
  const converter = new TcyConverter();

  it('基本的なTCYマーカーを変換できること', () => {
    const cases = [
      // 基本パターン
      ['†12‡', '<span class="tcy">12</span>'],
      ['†12‡の文章', '<span class="tcy">12</span>の文章'],
      ['†1‡と†2‡', '<span class="tcy">1</span>と<span class="tcy">2</span>'],
      // 変換なしのパターン
      ['マーカーなし', 'マーカーなし'],
      ['', '']

    ];

    cases.forEach(([input, expected]) => {
      expect(converter.process(input)).toBe(expected);
    });
  });

  it('staticメソッドでも同じ結果が得られること', () => {
    const input = '†12:34‡の時間';
    expect(TcyConverter.process(input)).toBe(converter.process(input));
  });
});