/**
 * Error codes for the application
 * アプリケーション全体で使用するエラーコード
 */
export type ErrorCode =
  | 'VALIDATION_ERROR'      // バリデーションエラー
  | 'NETWORK_ERROR'         // ネットワークエラー
  | 'PROCESSOR_ERROR'      // 処理エラー
  | 'TRANSFORM_ERROR'       // 変換エラー
  | 'GENERATION_ERROR'      // 生成エラー
  | 'PARSER_ERROR'          // パースエラー
  | 'DATABASE_ERROR'        // データベースエラー
  | 'DOM_ERROR'             // DOM操作のエラー
  | 'GENERAL_ERROR';        // その他の一般エラー

/**
 * Base error class for the application
 * アプリケーション固有のエラーのベースクラス
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly retriable: boolean = false,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = this.constructor.name;
    
    // Maintain proper prototype chain in ES5 environments
    // ES5環境でもプロトタイプチェーンを正しく保持
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Returns string representation of the error
   * エラーの文字列表現を返します
   */
  toString(): string {
    const parts = [
      `${this.name}[${this.code}]`,
      this.message,
      this.statusCode ? `Status: ${this.statusCode}` : null,
      this.retriable ? 'Retriable: true' : null
    ].filter(Boolean);

    return parts.join(' - ');
  }

  /**
   * Creates an error response object
   * エラーレスポンスオブジェクトを生成します
   */
  toResponse() {
    return {
      success: false,
      error: {
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        retriable: this.retriable
      }
    };
  }
}