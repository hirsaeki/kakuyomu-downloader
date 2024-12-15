import { NetworkError, ValidationError } from '@/lib/errors';
import { HttpClientError } from './types';

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