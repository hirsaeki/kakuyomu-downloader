import { NetworkError } from '@/types/error';

/**
 * タイムアウト付きのfetch関数
 * @param url リクエストURL
 * @param timeoutMs タイムアウト時間（ミリ秒）
 * @param options fetchのオプション
 * @returns Response
 * @throws NetworkError タイムアウトまたはネットワークエラー時
 */
export async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
  options: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const { signal } = controller;

  const timeout = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      controller.abort();
      reject(new Error('Timeout'));
    }, timeoutMs);
  });

  try {
    // Promise.raceでタイムアウトとfetchを競争
    const response = await Promise.race([
      fetch(url, {
        ...options,
        signal,
      }),
      timeout
    ]);

    if (!response.ok) {
      throw new NetworkError(`HTTP error: ${response.status}`, response.status);
    }

    return response;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message === 'Timeout') {
        throw new NetworkError('リクエストがタイムアウトしました', 408);
      }
      if (error.name === 'FetchError') {
        throw new NetworkError('ネットワークエラーが発生しました', 502);
      }
    }
    throw error;
  }
}