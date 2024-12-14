import { HttpClient, HttpResponse } from '@/lib/http/types';
import { EpisodeListResult, EpisodeContentResult } from './types';

/**
 * 小説サイトアダプターの基底クラス
 * @template T FetchHttpClientから返される生のレスポンスデータの型
 * サイト固有のアダプターで具体的な型を指定すること。
 *           - HTML文字列(string): DOMベースのスクレイピング用
 *           - JSONオブジェクト(object): REST API用
 * 
 * @example
 * ```typescript
 * // DOMスクレイピングの場合
 * class SampleAdapter extends BaseNovelSiteAdapter<string> {
 *   // HTML文字列を受け取ってDOMParserでパース
 * }
 * 
 * // REST APIの場合
 * class ApiAdapter extends BaseNovelSiteAdapter<ApiResponse> {
 *   // JSONレスポンスを型安全に処理
 * }
 * ```
 */
export abstract class BaseNovelSiteAdapter<T = unknown> {
  constructor(protected readonly httpClient: HttpClient) {}

  abstract readonly siteName: string;
  abstract readonly siteId: string;

  /**
   * 指定されたURLに対応可能か判定
   * @param url 判定対象のURL
   * @returns このアダプターで処理可能な場合はtrue
   */
  abstract isCompatible(url: string): boolean;

  /**
   * エピソード一覧を取得
   * @param url 作品のURL
   * @returns エピソード一覧情報
   */
  abstract fetchEpisodeList(url: string): Promise<EpisodeListResult>;

  /**
   * エピソード本文を取得
   * @param url エピソードのURL
   * @returns エピソードの内容
   */
  abstract fetchEpisodeContent(url: string): Promise<EpisodeContentResult>;

  /**
   * 作品URLの正規化
   * @param url 正規化対象のURL
   * @returns 正規化されたURL
   */
  abstract normalizeUrl(url: string): string;

  /**
   * エピソードURLの正規化
   * @param url 正規化対象のURL
   * @returns 正規化されたURL
   */
  abstract normalizeEpisodeUrl(url: string): string;

  /**
   * HTTPコンテンツの取得
   * 各アダプターの実装では、FetchHttpClientから返される
   * レスポンスデータを適切な型で受け取るように実装する
   * 
   * @param url リクエスト対象のURL
   * @returns HTTPレスポンス
   */
  protected abstract fetchContent(url: string): Promise<HttpResponse<T>>;

  /**
   * エピソードリスト取得失敗時のエラーレスポンスを生成
   */
  protected createErrorResult(error: string): EpisodeListResult {
    return {
      success: false,
      workTitle: '',
      author: '',
      episodes: [],
      error
    };
  }

  /**
   * エピソード本文取得失敗時のエラーレスポンスを生成
   */
  protected createEpisodeErrorResult(error: string): EpisodeContentResult {
    return {
      success: false,
      title: '',
      content: '',
      error
    };
  }
}