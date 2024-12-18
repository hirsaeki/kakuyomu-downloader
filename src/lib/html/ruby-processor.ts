import { createContextLogger } from '../logger';

const rubyLogger = createContextLogger('ruby-processor');

interface RubyProcessorOptions {
  /**
   * ネストしたrubyタグを検出した際の処理方法
   * - 'ignore': 無視して処理を続行（デフォルト）
   * - 'throw': エラーを投げる
   */
  nestedRubyBehavior?: 'ignore' | 'throw';
  
  /**
   * プレースホルダーの形式をカスタマイズ
   * デフォルト: ◆RUBY_{index}▲
   */
  placeholderFormat?: (index: number) => string;
}

/**
 * HTML内のrubyタグを適切に処理するためのユーティリティクラス
 */
export class RubyProcessor {
  private static readonly DEFAULT_OPTIONS: RubyProcessorOptions = {
    nestedRubyBehavior: 'ignore',
    placeholderFormat: (index: number) => `◆RUBY_${index}▲`
  };

  private readonly options: Required<RubyProcessorOptions>;

  constructor(options?: RubyProcessorOptions) {
    this.options = {
      ...RubyProcessor.DEFAULT_OPTIONS,
      ...options
    };
  }

  /**
   * HTML文字列内のrubyタグを保持したままtextContent的な処理を行う
   * @param html 処理対象のHTML文字列
   * @returns 処理済みのHTML文字列
   * @throws {Error} nestedRubyBehaviorが'throw'の場合、ネストしたrubyタグを検出すると例外を投げる
   */
  process(html: string): string {
    const rubyTags: Array<{
      placeholder: string;
      original: string;
    }> = [];

    // ネストしたrubyタグのチェック
    if (this.hasNestedRuby(html)) {
      rubyLogger.warn('ネストされたルビタグを検出', { html });
      if (this.options.nestedRubyBehavior === 'throw') {
        throw new Error('Nested ruby tags are not allowed');
      }
    }

    // Step 1: rubyタグを丸ごとプレースホルダーに置換
    let content = html.replace(
      /<ruby[^>]*>.*?<\/ruby>/g,
      (match) => {
        const placeholder = this.options.placeholderFormat(rubyTags.length);
        rubyTags.push({
          placeholder,
          original: match
        });
        return placeholder;
      }
    );

    // Step 2: textContentで処理
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    content = tempDiv.textContent || '';

    // Step 3: プレースホルダーをrubyタグに戻す
    rubyTags.forEach(({placeholder, original}) => {
      content = content.replace(placeholder, original);
    });

    rubyLogger.debug('ルビ処理完了', {
      rubyTagCount: rubyTags.length,
      resultLength: content.length
    });

    return content;
  }

  /**
   * ネストしたrubyタグの存在チェック
   */
  private hasNestedRuby(html: string): boolean {
    return /<ruby[^>]*>[^<]*<ruby/.test(html);
  }

  /**
   * インスタンスを生成せずに直接処理を行うユーティリティメソッド
   */
  static process(html: string, options?: RubyProcessorOptions): string {
    const processor = new RubyProcessor(options);
    return processor.process(html);
  }
}

// 使用例:
/*
// 基本的な使用方法
const html = '<ruby>漢字<rt>かんじ</rt></ruby>のテスト';
const processed = RubyProcessor.process(html);

// インスタンスを作成して詳細な設定を行う場合
const processor = new RubyProcessor({
  nestedRubyBehavior: 'throw',
  placeholderFormat: (index) => `[RUBY:${index}]`
});
const result = processor.process(html);
*/