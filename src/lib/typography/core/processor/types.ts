export interface TextProcessor {
  /**
   * テキストをXHTML形式に変換します
   * @param text 変換対象のテキスト
   * @param title 文書のタイトル
   * @returns XHTML形式の文字列
   */
  convertToXhtml(text: string, title: string): string;
}

export interface TextTransformRule {
  /**
   * 変換ルールの優先度
   * 数値が小さいほど先に実行されます
   */
  priority: number;

  /**
   * テキストを変換します
   * @param text 変換対象のテキスト
   * @returns 変換後のテキスト
   */
  transform(text: string): string;
}

export interface TextProcessorOptions {
  /**
   * 変換ルールの配列
   * priorityの順に実行されます
   */
  rules?: TextTransformRule[];
}