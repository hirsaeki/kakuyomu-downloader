import { AppError } from './base';

/**
 * Validation error class
 * バリデーションエラー
 * 入力値や状態が不正な場合に使用します
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly details?: Record<string, string[]>
  ) {
    super(message, 'VALIDATION_ERROR', false);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  /**
   * バリデーションエラーのレスポンスを生成します
   */
  toResponse() {
    return {
      ...super.toResponse(),
      error: {
        ...super.toResponse().error,
        details: this.details
      }
    };
  }
}