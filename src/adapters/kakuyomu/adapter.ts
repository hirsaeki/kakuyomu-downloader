import { NovelSiteAdapter, EpisodeListResult, EpisodeContentResult } from '../types';
import { KakuyomuParser } from './parser';
import { KakuyomuValidator } from './validator';
import { HttpClient } from '@/lib/http/types';
import { AppError, ValidationError, NetworkError } from '@/lib/errors';

export class KakuyomuAdapter implements NovelSiteAdapter {
  readonly siteName = 'カクヨム';
  readonly siteId = 'kakuyomu';
  readonly urlPattern = KakuyomuValidator.WORK_URL_PATTERN;

  constructor(
    private readonly httpClient: HttpClient
  ) {}

  isCompatible(url: string): boolean {
    return KakuyomuValidator.isValidWorkUrl(url);
  }

  async fetchEpisodeList(url: string): Promise<EpisodeListResult> {
    try {
      if (!this.isCompatible(url)) {
        throw new ValidationError('無効なURLです', {
          url: ['カクヨムの作品URLではありません']
        });
      }

      const normalizedUrl = this.normalizeUrl(url);

      // HTMLコンテンツの取得
      const response = await this.httpClient.get<{
        success: boolean;
        data?: { content: string };
        error?: string;
      }>(normalizedUrl);

      const content = response.data?.data?.content;
      if (!content) {
        throw new NetworkError('コンテンツの取得に失敗しました', true);
      }

      // パース処理
      const { workTitle, author, episodes } = KakuyomuParser.parseEpisodeList(content);

      if (episodes.length === 0) {
        throw new AppError('エピソードリストがパースできませんでした', 'GENERAL_ERROR');
      }

      return {
        success: true,
        workTitle,
        author,
        episodes,
        error: null
      };

    } catch (error) {
      // エラーレスポンスの生成
      if (error instanceof AppError) {
        const response = error.toResponse();
        return {
          success: false,
          workTitle: '',
          author: '',
          episodes: [],
          error: response.error.message
        };
      }

      // 未知のエラー
      return {
        success: false,
        workTitle: '',
        author: '',
        episodes: [],
        error: error instanceof Error ? error.message : '不明なエラーが発生しました'
      };
    }
  }

  async fetchEpisodeContent(url: string): Promise<EpisodeContentResult> {
    try {
      if (!KakuyomuValidator.isValidEpisodeUrl(url)) {
        throw new ValidationError('無効なエピソードURLです', {
          url: ['カクヨムのエピソードURLではありません']
        });
      }

      const normalizedUrl = this.normalizeEpisodeUrl(url);

      // HTMLコンテンツの取得
      const response = await this.httpClient.get<{
        success: boolean;
        data?: { content: string };
        error?: string;
      }>(normalizedUrl);

      const content = response.data?.data?.content;
      if (!content) {
        throw new NetworkError('コンテンツの取得に失敗しました', true);
      }

      // パース処理
      const { title, content: parsedContent } = KakuyomuParser.parseEpisodeContent(content);

      return {
        success: true,
        title,
        content: parsedContent,
        error: null
      };

    } catch (error) {
      // エラーレスポンスの生成
      if (error instanceof AppError) {
        const response = error.toResponse();
        return {
          success: false,
          title: '',
          content: '',
          error: response.error.message
        };
      }

      // 未知のエラー
      return {
        success: false,
        title: '',
        content: '',
        error: error instanceof Error ? error.message : '不明なエラーが発生しました'
      };
    }
  }

  normalizeUrl(url: string): string {
    return KakuyomuValidator.normalizeWorkUrl(url);
  }

  normalizeEpisodeUrl(url: string): string {
    return KakuyomuValidator.normalizeEpisodeUrl(url);
  }
}