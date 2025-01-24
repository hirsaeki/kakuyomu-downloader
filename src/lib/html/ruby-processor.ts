import { createContextLogger } from '@/lib/logger';

const rubyLogger = createContextLogger('ruby-processor');

/**
 * XHTMLルビタグと青空文庫形式のルビ記法を相互に変換するプロセッサー
 */
export class RubyProcessor {
  /**
   * XHTMLのルビタグを青空文庫形式のルビ記法に変換する
   * @param html XHTMLルビタグを含むテキスト
   * @returns 青空文庫形式のルビ記法に変換されたテキスト
   */
  toAozoraRuby(html: string): string {
    rubyLogger.debug('XHTMLから青空文庫形式への変換を開始', {
      textLength: html.length
    });

    // 1. まず全てのrp要素を除去
    let result = html.replace(/<rp>.*?<\/rp>/g, '');
    
    // 2. 全てのruby要素を変換
    result = result.replace(
      /<ruby>(?:<rb>)?([^<]+)(?:<\/rb>)?<rt>([^<]+)<\/rt>(?:<rtc>.*?<\/rtc>)?<\/ruby>/g,
      (_, base, ruby) => {
        // 漢字のみの場合は｜を省略
        const prefix = /^[一-龯々]+$/.test(base) ? '' : '｜';
        return `${prefix}${base}《${ruby}》`;
      }
    );

    rubyLogger.debug('青空文庫形式への変換が完了', {
      processedLength: result.length,
      sampleText: result.slice(0, 100)
    });

    return result;
  }

  /**
   * 青空文庫形式のルビ記法をXHTMLのルビタグに変換する
   * @param text 青空文庫形式のルビ記法を含むテキスト
   * @returns XHTMLのルビタグに変換されたテキスト
   */
  fromAozoraRuby(text: string): string {
    rubyLogger.debug('青空文庫形式からXHTMLへの変換を開始', {
      textLength: text.length
    });

    const result = text.replace(
      /｜(.+?)《(.+?)》/g,
      '<ruby>$1<rt>$2</rt><rp>（</rp><rp>）</rp></ruby>'
    );

    rubyLogger.debug('XHTMLへの変換が完了', {
      processedLength: result.length,
      sampleText: result.slice(0, 100)
    });

    return result;
  }

  /**
   * クラスメソッドとしてのtoAozoraRuby
   * @param html XHTMLルビタグを含むテキスト
   * @returns 青空文庫形式のルビ記法に変換されたテキスト
   */
  static toAozoraRuby(html: string): string {
    const processor = new RubyProcessor();
    return processor.toAozoraRuby(html);
  }

  /**
   * クラスメソッドとしてのfromAozoraRuby
   * @param text 青空文庫形式のルビ記法を含むテキスト
   * @returns XHTMLのルビタグに変換されたテキスト
   */
  static fromAozoraRuby(text: string): string {
    const processor = new RubyProcessor();
    return processor.fromAozoraRuby(text);
  }
}