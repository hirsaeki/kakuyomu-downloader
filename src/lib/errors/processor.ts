import { AppError, ErrorCode } from './base';

/**
 * テキスト処理に関するエラー
 * テキストの変換処理や整形処理中に発生したエラーに使用します
 */
export class ProcessorError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = 'PROCESSOR_ERROR'
  ) {
    super(message, code);
    Object.setPrototypeOf(this, ProcessorError.prototype);
  }
}