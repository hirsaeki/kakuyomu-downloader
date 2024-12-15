import { ValidationError } from '@/lib/errors';
import { HttpClientError } from './types';
import { createContextLogger } from '@/lib/logger';

const validationLogger = createContextLogger('http-validation');

interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    statusCode?: number;
    type?: string;
  };
}

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * レスポンスの型が正しいか検証
 */
export function validateResponse<T>(response: unknown): asserts response is ApiResponse<T> {
  if (!response || typeof response !== 'object') {
    validationLogger.error('不正なレスポンス形式', { response });
    throw new ValidationError('不正なレスポンス形式です');
  }

  if (!('success' in response)) {
    validationLogger.error('successフィールドの欠落', { response });
    throw new ValidationError('レスポンスにsuccess フィールドがありません');
  }

  const typedResponse = response as ApiResponse<T>;
  
  if (!typedResponse.success && typedResponse.error) {
    validationLogger.error('APIエラーレスポンス', {
      message: typedResponse.error.message,
      statusCode: typedResponse.error.statusCode,
      type: typedResponse.error.type
    });
    throw new HttpClientError(
      typedResponse.error.message || '不明なエラー',
      typedResponse.error.statusCode
    );
  }
}

/**
 * HTML文字列の基本的な妥当性を検証する
 */
export function validateHtmlContent(content: string): Document {
  // 空文字チェック
  if (!content?.trim()) {
    validationLogger.error('空のHTMLコンテンツ');
    throw new ValidationError('取得したコンテンツが空です');
  }

  // HTMLとしてパース
  const doc = new DOMParser().parseFromString(content, 'text/html');

  // パースエラーのチェック
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    validationLogger.error('HTMLパースエラー', {
      error: parseError.textContent
    });
    throw new ValidationError('HTMLの解析に失敗しました');
  }

  // 基本構造の検証
  if (!doc.documentElement || !doc.body) {
    validationLogger.error('不正なHTML構造', {
      hasDocumentElement: !!doc.documentElement,
      hasBody: !!doc.body
    });
    throw new ValidationError('不正なHTML形式です');
  }

  validationLogger.debug('HTML基本検証完了');
  return doc;
}