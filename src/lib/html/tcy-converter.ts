/**
 * Typography処理で付与されたTCY（縦中横）マーカーをXHTMLのspanタグに変換するコンバーター
 * シンプルな正規表現置換で実装されており、エラーが発生する可能性は極めて低いため、
 * ロギング処理は実装していない。必要になった場合は後から追加する。
 */
export class TcyConverter {
  process(text: string): string {
    return text.replace(/〘(.+?)〙/g, '<span class="tcy">$1</span>');
  }

  static process(text: string): string {
    const converter = new TcyConverter();
    return converter.process(text);
  }
}
