import { BaseNovelSiteAdapter } from './core/adapter';
import { KakuyomuAdapter } from './sites/kakuyomu/adapter';

/**
 * アダプターファクトリーのインターフェース
 */
export interface NovelSiteAdapterFactory {
  getAdapter(url: string): BaseNovelSiteAdapter<unknown> | null;
  getAdapterById(id: string): BaseNovelSiteAdapter<unknown> | null;
  getRegisteredAdapters(): BaseNovelSiteAdapter<unknown>[];
}

/**
 * アダプターの初期化を行う
 */
export const setupAdapters = (): NovelSiteAdapterFactory => {
  // 各サイトのアダプターを初期化
  const adapters: BaseNovelSiteAdapter<unknown>[] = [
    new KakuyomuAdapter()
  ];
  
  return {
    getAdapter: (url) => 
      adapters.find(adapter => adapter.isCompatible(url)) ?? null,
    getAdapterById: (id) =>
      adapters.find(adapter => adapter.siteId === id) ?? null,
    getRegisteredAdapters: () => [...adapters]
  };
};