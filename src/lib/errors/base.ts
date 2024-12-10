/**
 * アプリケーション固有のエラーのベースクラス
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    
    // ES5環境でもプロトタイプチェーンを正しく保持
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * エラーの文字列表現を返します
   */
  toString(): string {
    return this.code
      ? `${this.name}[${this.code}]: ${this.message}`
      : `${this.name}: ${this.message}`;
  }
}