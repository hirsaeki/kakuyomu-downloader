import { HttpClient, HttpClientConfig, HttpClientError, HttpResponse, ProxyConfig } from './types';
import { validateResponse } from './errors';
import { NETWORK_CONFIG } from '@/config/constants';
import { createContextLogger } from '@/lib/logger';

const httpLogger = createContextLogger('http');

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
    httpLogger.debug('HTTPクライアントを初期化', {
      config: this.config,
      hasProxyConfig: !!proxyConfig
    });
  }

  /**
   * カスタムヘッダーを設定
   */
  setHeaders(headers: Record<string, string> | undefined): void {
    this.customHeaders = headers;
    httpLogger.debug('カスタムヘッダーを設定', { headers });
  }

  /**
   * 設定を更新
   */
  setConfig(config: Partial<HttpClientConfig>): void {
    const oldConfig = { ...this.config };
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
    httpLogger.debug('設定を更新', {
      oldConfig,
      newConfig: this.config
    });
  }

  /**
   * プロキシ設定を更新
   */
  setProxyConfig(config: ProxyConfig | undefined): void {
    this.proxyConfig = config;
    httpLogger.debug('プロキシ設定を更新', {
      hasProxyConfig: !!config
    });
  }

  /**
   * GETリクエストを実行
   */
  async get<T>(url: string): Promise<HttpResponse<T>> {
    httpLogger.info('リクエスト開始', { url });
    let lastError: Error | null = null;
    const maxAttempts = this.config.retry?.maxAttempts ?? 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        if (attempt > 0) {
          httpLogger.debug('リトライ実行', {
            attempt: attempt + 1,
            maxAttempts,
            url
          });
        }

        const requestUrl = this.proxyConfig
          ? this.proxyConfig.buildUrl(url)
          : url;

        const response = await this.executeRequest(requestUrl);
        const data = await this.parseResponse<T>(response);

        httpLogger.info('リクエスト成功', {
          url,
          status: response.status,
          contentType: response.headers.get('content-type')
        });

        return {
          data,
          status: response.status,
          headers: this.extractHeaders(response)
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (error instanceof HttpClientError) {
          if (this.isRetryableError(error) && attempt < maxAttempts - 1) {
            httpLogger.warn('リトライ可能なエラーが発生', {
              attempt: attempt + 1,
              maxAttempts,
              error: error.message,
              status: error.status,
              url
            });
            await this.delay(attempt);
            continue;
          }
        }
        httpLogger.error('リクエスト失敗', {
          attempt: attempt + 1,
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : 'Unknown error',
          url
        });
        throw error;
      }
    }

    httpLogger.error('リトライ回数超過', {
      maxAttempts,
      url,
      error: lastError
    });
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
        httpLogger.warn('リクエストタイムアウト', {
          url,
          timeout: this.config.timeouts?.request
        });
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
      httpLogger.debug('リクエスト実行', {
        url,
        headers: {
          ...this.config.headers,
          ...(this.customHeaders || {})
        }
      });

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
    httpLogger.debug('レスポンスのパース開始', { contentType });

    if (contentType?.includes('application/json')) {
      const data = await response.json();
      validateResponse(data);
      return data as T;
    }

    if (contentType?.includes('text/')) {
      const text = await response.text();
      return text as unknown as T;
    }

    httpLogger.warn('未対応のContent-Type', { contentType });
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
    httpLogger.debug('レスポンスヘッダーを抽出', { headers });
    return headers;
  }

  /**
   * リトライ可能なエラーかチェック
   */
  private isRetryableError(error: HttpClientError): boolean {
    const isRetryable = (
      error.status === undefined || // ネットワークエラー
      error.status === 429 || // レート制限
      error.status >= 500 // サーバーエラー
    );

    httpLogger.debug('リトライ可否を判定', {
      error: {
        message: error.message,
        status: error.status
      },
      isRetryable
    });

    return isRetryable;
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

    httpLogger.debug('リトライ待機', {
      attempt,
      baseDelay,
      maxDelay,
      calculatedDelay: delay
    });

    await new Promise(resolve => setTimeout(resolve, delay));
  }
}