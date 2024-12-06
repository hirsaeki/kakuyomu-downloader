import { HttpClient, HttpClientConfig, HttpClientError, HttpResponse, ProxyConfig } from './types';
import { validateResponse } from './errors';
import { NETWORK_CONFIG } from '@/config/constants';

/**
 * Fetch APIを使用したHTTPクライアントの実装
 */
export class FetchHttpClient implements HttpClient {
  private config: Required<HttpClientConfig>;
  private proxyConfig?: ProxyConfig;
  private customHeaders?: Record<string, string>;

  constructor(
    config: Partial<HttpClientConfig> = {},
    proxyConfig?: ProxyConfig
  ) {
    // デフォルト設定とマージ
    this.config = {
      headers: {
        'Accept': NETWORK_CONFIG.HTTP.HEADERS.ACCEPT.HTML,
        'Accept-Language': NETWORK_CONFIG.HTTP.HEADERS.ACCEPT_LANGUAGE,
      },
      timeouts: {
        request: NETWORK_CONFIG.TIMEOUTS.REQUEST,
        retry: NETWORK_CONFIG.RETRY.BASE_DELAY
      },
      retry: {
        maxAttempts: NETWORK_CONFIG.RETRY.MAX_COUNT,
        baseDelay: NETWORK_CONFIG.RETRY.BASE_DELAY,
        maxDelay: NETWORK_CONFIG.RETRY.MAX_DELAY
      },
      ...config
    };
    this.proxyConfig = proxyConfig;
  }

  /**
   * カスタムヘッダーを設定
   */
  setHeaders(headers: Record<string, string> | undefined): void {
    this.customHeaders = headers;
  }

  /**
   * 設定を更新
   */
  setConfig(config: Partial<HttpClientConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      timeouts: {
        ...this.config.timeouts,
        ...config.timeouts
      },
      retry: {
        ...this.config.retry,
        ...config.retry
      },
      headers: {
        ...this.config.headers,
        ...config.headers
      }
    };
  }

  /**
   * プロキシ設定を更新
   */
  setProxyConfig(config: ProxyConfig | undefined): void {
    this.proxyConfig = config;
  }

  /**
   * GETリクエストを実行
   */
  async get<T>(url: string): Promise<HttpResponse<T>> {
    let lastError: Error | null = null;
    const maxAttempts = this.config.retry?.maxAttempts ?? 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // プロキシURLの構築
        const requestUrl = this.proxyConfig
          ? this.proxyConfig.buildUrl(url)
          : url;

        const response = await this.executeRequest(requestUrl);
        const data = await this.parseResponse<T>(response);

        return {
          data,
          status: response.status,
          headers: this.extractHeaders(response)
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (error instanceof HttpClientError) {
          // リトライ可能なエラーの場合は待機して再試行
          if (this.isRetryableError(error) && attempt < maxAttempts - 1) {
            await this.delay(attempt);
            continue;
          }
        }
        throw error;
      }
    }

    throw lastError || new HttpClientError('Max retry attempts exceeded');
  }

  /**
   * リクエストを実行
   */
  private async executeRequest(url: string): Promise<Response> {
    const controller = new AbortController();

    // タイムアウトとリクエストをraceする
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        controller.abort();
        reject(new HttpClientError('Request timeout'));
      }, this.config.timeouts?.request);
    });

    // 実際のリクエスト
    const fetchPromise = fetch(url, {
      headers: {
        ...this.config.headers,
        ...(this.customHeaders || {})  // customHeadersが存在する場合のみマージ
      },
      signal: controller.signal
    });

    try {
      // タイムアウトとリクエストをrace
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

      if (!response.ok) {
        throw new HttpClientError(
          `HTTP error: ${response.status}`,
          response.status,
          response
        );
      }

      return response;

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new HttpClientError('Request timeout', undefined, error);
        }
        throw new HttpClientError(
          error.message,
          undefined,
          error
        );
      }
      throw error;
    }
  }

  /**
   * レスポンスをパース
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      const data = await response.json();
      validateResponse(data);
      return data as T;
    }

    if (contentType?.includes('text/')) {
      const text = await response.text();
      return text as unknown as T;
    }

    throw new HttpClientError(
      `Unsupported content type: ${contentType}`,
      response.status,
      response
    );
  }

  /**
   * レスポンスヘッダーを抽出
   */
  private extractHeaders(response: Response): Record<string, string> {
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return headers;
  }

  /**
   * リトライ可能なエラーかチェック
   */
  private isRetryableError(error: HttpClientError): boolean {
    return (
      error.status === undefined || // ネットワークエラー
      error.status === 429 || // レート制限
      error.status >= 500 // サーバーエラー
    );
  }

  /**
   * 指数バックオフ付きの遅延
   */
  private async delay(attempt: number): Promise<void> {
    const baseDelay = this.config.retry?.baseDelay ?? NETWORK_CONFIG.RETRY.BASE_DELAY;
    const maxDelay = this.config.retry?.maxDelay ?? NETWORK_CONFIG.RETRY.MAX_DELAY;

    const exponentialDelay = Math.min(
      baseDelay * Math.pow(2, attempt),
      maxDelay
    );

    // ±25%のジッター
    const jitter = exponentialDelay * 0.5 * (Math.random() - 0.5);
    const delay = Math.round(exponentialDelay + jitter);

    await new Promise(resolve => setTimeout(resolve, delay));
  }
}
