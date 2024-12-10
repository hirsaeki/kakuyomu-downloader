import { AppError } from './base';

/**
 * 生成処理に関するエラー
 * EPUBファイルの生成やコンテンツの変換中に発生したエラーに使用します
 */
export class GenerationError extends AppError {
  constructor(
    message: string,
    code: string = 'GENERATION_ERROR'
  ) {
    super(message, code);
    Object.setPrototypeOf(this, GenerationError.prototype);
  }
}