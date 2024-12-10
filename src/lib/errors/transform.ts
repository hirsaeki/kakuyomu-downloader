import { ErrorCode, AppError } from './base';

/**
 * テキスト変換に関するエラー
 * パターンマッチングや文字変換処理中に発生したエラーに使用します
 */
export class TransformError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = 'TRANSFORM_ERROR'
  ) {
    super(message, code);
    Object.setPrototypeOf(this, TransformError.prototype);
  }
}