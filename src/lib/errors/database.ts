import { AppError } from './base';

/**
 * データベース操作に関するエラー
 * キャッシュの保存・読み込み・削除などのDB操作で発生したエラーに使用します
 */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    retriable: boolean = true
  ) {
    super(message, 'DATABASE_ERROR', retriable);
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}