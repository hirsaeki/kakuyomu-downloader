import { NetworkError, ValidationError } from '@/lib/errors';
import { HttpClientError } from './types';

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
 * HTTPエラーをアプリケーションエラーに変換する
 */
export function convertHttpError(error: HttpClientError): NetworkError | ValidationError {
  // ステータスコードに基づいてエラーを分類
  if (error.status) {
    switch (error.status) {
      case 400:
        return new ValidationError('不正なリクエストです');
      case 404:
        return new ValidationError('リソースが見つかりません');
      case 429:
        return new NetworkError('アクセス制限中です', true, error.status);
      case 403:
        return new NetworkError('アクセスが制限されています', false, error.status);
      default:
        if (error.status >= 500) {
          return new NetworkError(
            `サーバーエラーが発生しました (${error.status})`,
            true,
            error.status
          );
        }
    }
  }

  // 一般的なネットワークエラー
  if (error.message.includes('timeout')) {
    return new NetworkError('リクエストがタイムアウトしました', true);
  }
  if (error.message.includes('network')) {
    return new NetworkError('ネットワークエラーが発生しました', true);
  }

  // その他のエラー
  return new NetworkError(
    error.message || '不明なエラーが発生しました',
    false
  );
}

/**
 * レスポンスの型が正しいか検証
 */
export function validateResponse<T>(response: unknown): asserts response is ApiResponse<T> {
  if (!response || typeof response !== 'object') {
    throw new ValidationError('不正なレスポンス形式です');
  }

  if (!('success' in response)) {
    throw new ValidationError('レスポンスにsuccess フィールドがありません');
  }

  const typedResponse = response as ApiResponse<T>;
  
  if (!typedResponse.success && typedResponse.error) {
    throw new HttpClientError(
      typedResponse.error.message || '不明なエラー',
      typedResponse.error.statusCode
    );
  }
}