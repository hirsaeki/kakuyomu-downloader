/**
 * HTTPクライアントの設定オプション
 */
export interface HttpClientConfig {
  /**
   * デフォルトのヘッダー
   * 全てのリクエストに適用されます
   */
  headers?: Record<string, string>;

  /**
   * タイムアウト設定
   */
  timeouts: {
    /** リクエストのタイムアウト時間(ms) */
    request: number;
    /** リトライ間のディレイ時間(ms) */
    retry: number;
  };

  /**
   * リトライ設定
   */
  retry: {
    /** 最大リトライ回数 */
    maxAttempts: number;
    /** 初期待機時間(ms) */
    baseDelay: number;
    /** 最大待機時間(ms) */
    maxDelay: number;
  };
}

/**
 * プロキシ設定
 */
export interface ProxyConfig {
  /** プロキシエンドポイント */
  endpoint: string;
  /** プロキシURLビルダー関数 */
  buildUrl: (targetUrl: string) => string;
}

/**
 * HTTPクライアントのレスポンス型
 */
export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

/**
 * HTTPクライアントのエラー型
 */
export class HttpClientError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'HttpClientError';
  }
}

/**
 * HTTPクライアントインターフェース
 */
export interface HttpClient {
  /**
   * GETリクエストを実行
   * @throws {HttpClientError} リクエストに失敗した場合
   * @throws {ValidationError} URLが無効な場合
   */
  get<T>(url: string, config?: RequestInit): Promise<HttpResponse<T>>;

  /**
   * クライアントの設定を更新
   */
  setConfig(config: Partial<HttpClientConfig>): void;
}
