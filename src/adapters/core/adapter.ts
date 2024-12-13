import { HttpClient, HttpResponse } from '@/lib/http/types';
import { EpisodeListResult, EpisodeContentResult } from './types';

/**
 * 小説サイトアダプターの基底クラス
 * T: HTTPレスポンスの型
 */
export abstract class BaseNovelSiteAdapter<T = unknown> {
  constructor(protected readonly httpClient: HttpClient) {}

  abstract readonly siteName: string;
  abstract readonly siteId: string;

  /**
   * 指定されたURLに対応可能か判定
   */
  abstract isCompatible(url: string): boolean;

  /**
   * エピソード一覧を取得
   */
  abstract fetchEpisodeList(url: string): Promise<EpisodeListResult>;

  /**
   * エピソード本文を取得
   */
  abstract fetchEpisodeContent(url: string): Promise<EpisodeContentResult>;

  /**
   * 作品URLの正規化
   */
  abstract normalizeUrl(url: string): string;

  /**
   * エピソードURLの正規化
   */
  abstract normalizeEpisodeUrl(url: string): string;

  /**
   * HTTPコンテンツの取得
   */
  protected abstract fetchContent(url: string): Promise<HttpResponse<T>>;

  // ユーティリティメソッド
  protected createErrorResult(error: string): EpisodeListResult {
    return {
      success: false,
      workTitle: '',
      author: '',
      episodes: [],
      error
    };
  }

  protected createEpisodeErrorResult(error: string): EpisodeContentResult {
    return {
      success: false,
      title: '',
      content: '',
      error
    };
  }
}