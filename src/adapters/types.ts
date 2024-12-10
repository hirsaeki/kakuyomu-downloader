import { Episode } from '@/types';
import { HttpClient } from '@/lib/http/types';

export interface EpisodeListResult {
  success: boolean;
  workTitle: string;
  author: string;
  episodes: Episode[];
  error: string | null;
  fromCache?: boolean;
}

export interface EpisodeContentResult {
  success: boolean;
  title: string;
  content: string;
  error: string | null;
  fromCache?: boolean;
}

export interface NovelSiteAdapter {
  readonly siteName: string;
  readonly siteId: string;
  readonly urlPattern: RegExp;

  /**
   * 指定されたURLがこのアダプターで処理可能かを判定
   */
  isCompatible(url: string): boolean;

  /**
   * エピソード一覧を取得
   * @throws {ValidationError} 非対応のURLまたはバリデーションエラー発生時
   * @throws {NetworkError} ネットワーク接続やサーバーエラー発生時
   * @throws {AppError} その他のエラー（コンテンツ解析エラーなど）
   */
  fetchEpisodeList(url: string): Promise<EpisodeListResult>;

  /**
   * エピソードの本文を取得
   * @throws {ValidationError} 非対応のURLまたはバリデーションエラー発生時
   * @throws {NetworkError} ネットワーク接続やサーバーエラー発生時
   * @throws {AppError} その他のエラー（コンテンツ解析エラーなど）
   */
  fetchEpisodeContent(url: string): Promise<EpisodeContentResult>;

  /**
   * 作品URLを正規化（クエリパラメータの削除など）
   * @throws {ValidationError} 無効なURLの場合
   */
  normalizeUrl(url: string): string;

  /**
   * エピソードURLを正規化
   * @throws {ValidationError} 無効なURLの場合
   */
  normalizeEpisodeUrl(url: string): string;
}

export interface AdapterConfig {
  httpClient: HttpClient;
  proxyConfig?: {
    endpoint: string;
    buildUrl: (url: string) => string;
  };
}

/**
 * アダプターファクトリーインターフェース
 */
export interface NovelSiteAdapterFactory {
  /**
   * アダプターを登録
   */
  register(adapter: NovelSiteAdapter): void;

  /**
   * 指定されたURLに対応するアダプターを取得
   */
  getAdapter(url: string): NovelSiteAdapter | null;

  /**
   * 登録されているアダプターの一覧を取得
   */
  getRegisteredAdapters(): NovelSiteAdapter[];
}
/**
 * パース結果の型定義
 */
export interface ParsedEpisodeList {
  workTitle: string;
  author: string;
  episodes: Episode[];
}

export interface ParsedEpisodeContent {
  title: string;
  content: string;
}

/**
 * DOM要素の取得結果の型定義
 */
export interface ParsedWorkElements {
  titleElement: Element | null;
  authorElement: Element | null;
}

export interface ParsedEpisodeElements {
  href: string | null;
  titleElement: Element | undefined;
  dateElement: HTMLTimeElement | null;
}

/**
 * バリデーション済みの要素の型定義
 */
export interface ValidWorkElements {
  titleElement: Element;
  authorElement: Element;
}

export interface ValidEpisodeElements {
  href: string;
  titleElement: Element;
  dateElement: HTMLTimeElement;
}