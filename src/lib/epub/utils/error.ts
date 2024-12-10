import { ValidationError, NovelDownloaderError } from '@/types';

/**
 * EPUBジェネレーターのエラーハンドラー
 */
export class EPUBErrorHandler {
  /**
   * エラーを適切な形式に変換して返す
   */
  static handleError(error: unknown): { success: false; error: string } {
    if (error instanceof ValidationError || error instanceof NovelDownloaderError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'EPUB生成中に不明なエラーが発生しました'
    };
  }

  /**
   * バリデーションエラーを生成
   */
  static createValidationError(message: string): ValidationError {
    return new ValidationError(message);
  }

  /**
   * エラー内容をフォーマット
   */
  static formatError(prefix: string, error: unknown): string {
    return `${prefix}: ${error instanceof Error ? error.message : '不明なエラー'}`;
  }
}

export default EPUBErrorHandler;