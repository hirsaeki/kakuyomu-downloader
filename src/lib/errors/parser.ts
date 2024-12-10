import { AppError } from './base';

/**
 * Parser error class
 * パーサーエラー
 * HTML/DOM構造の解析に関連するエラーを扱います
 */
export class ParserError extends AppError {
  constructor(
    message: string,
    public readonly details: {
      selector?: string;    // 失敗したセレクター
      element?: string;     // 対象の要素タイプ
      path?: string;        // DOM内のパス
      context?: string;     // その他の文脈情報
    }
  ) {
    super(message, 'PARSER_ERROR', false);
    Object.setPrototypeOf(this, ParserError.prototype);
  }

  /**
   * エラーレスポンスを生成します
   */
  toResponse() {
    return {
      ...super.toResponse(),
      error: {
        ...super.toResponse().error,
        details: {
          message: this.message,
          ...this.details
        }
      }
    };
  }
}