import { NovelSiteAdapter, NovelSiteAdapterFactory } from './types';
import { ValidationError } from '@/types';
import { FetchHttpClient } from '@/lib/http/fetch-client';
import { NETWORK_CONFIG } from '@/config/constants';

class AdapterFactoryRegistry implements NovelSiteAdapterFactory {
  private static instance: AdapterFactoryRegistry;
  private adapters = new Map<string, NovelSiteAdapter>();
  private httpClient: FetchHttpClient;

  private constructor() {
    this.httpClient = new FetchHttpClient(
      {
        headers: {
          'Accept': NETWORK_CONFIG.HTTP.HEADERS.ACCEPT.HTML,
          'Accept-Language': NETWORK_CONFIG.HTTP.HEADERS.ACCEPT_LANGUAGE,
        }
      },
      {
        endpoint: NETWORK_CONFIG.PROXY.ENDPOINTS.FETCH_CONTENT,
        buildUrl: (url) => `${NETWORK_CONFIG.PROXY.ENDPOINTS.FETCH_CONTENT}?url=${encodeURIComponent(url)}`
      }
    );
  }

  static getInstance(): AdapterFactoryRegistry {
    if (!AdapterFactoryRegistry.instance) {
      AdapterFactoryRegistry.instance = new AdapterFactoryRegistry();
    }
    return AdapterFactoryRegistry.instance;
  }

  /**
   * アダプターを登録
   */
  register(adapter: NovelSiteAdapter): void {
    if (!adapter.siteId) {
      throw new ValidationError('アダプターにsiteIdが設定されていません');
    }

    if (this.adapters.has(adapter.siteId)) {
      throw new ValidationError(`アダプター "${adapter.siteId}" は既に登録されています`);
    }

    this.adapters.set(adapter.siteId, adapter);
  }

  /**
   * 指定されたURLに対応するアダプターを取得
   */
  getAdapter(url: string): NovelSiteAdapter | null {
    if (!url) return null;

    for (const adapter of this.adapters.values()) {
      try {
        if (adapter.isCompatible(url)) {
          return adapter;
        }
      } catch {
        continue;  // エラーは無視して次のアダプターを試す
      }
    }
    return null;
  }

  /**
   * 登録されているアダプターの一覧を取得
   */
  getRegisteredAdapters(): NovelSiteAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * サイトIDに基づいてアダプターを取得
   */
  getAdapterById(siteId: string): NovelSiteAdapter | null {
    return this.adapters.get(siteId) || null;
  }

  /**
   * HTTPクライアントを取得
   */
  getHttpClient(): FetchHttpClient {
    return this.httpClient;
  }

  clear(): void {
    this.adapters.clear();
  }
}

// シングルトンインスタンスをエクスポート
export const adapterRegistry = AdapterFactoryRegistry.getInstance();