import { AppError } from './base';

/**
 * バリデーションエラー
 * 入力値や状態が不正な場合に使用します
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    code: string = 'VALIDATION_ERROR'
  ) {
    super(message, code);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}