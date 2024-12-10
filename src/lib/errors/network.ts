import { AppError } from './base';

/**
 * Network error class
 * ネットワークエラー
 * ネットワーク通信に関連するエラーを扱います
 */
export class NetworkError extends AppError {
  constructor(
    message: string,
    retriable: boolean = true,
    statusCode?: number,
  ) {
    super(message, 'NETWORK_ERROR', retriable, statusCode);
    Object.setPrototypeOf(this, NetworkError.prototype);
  }

  /**
   * Creates a timeout error instance
   * タイムアウトエラーのインスタンスを生成します
   */
  static timeout(message: string = 'Request timed out') {
    return new NetworkError(message, true, 408);
  }

  /**
   * Creates a not found error instance
   * Not Foundエラーのインスタンスを生成します
   */
  static notFound(message: string = 'Resource not found') {
    return new NetworkError(message, false, 404);
  }

  /**
   * Creates a server error instance
   * サーバーエラーのインスタンスを生成します
   */
  static serverError(message: string = 'Internal server error') {
    return new NetworkError(message, true, 500);
  }
}