import { BaseNovelSiteAdapter } from '../../core/adapter';
import { EpisodeListResult, EpisodeContentResult } from '../../core/types';
import { HttpResponse } from '@/lib/http/types';
import { FetchHttpClient } from '@/lib/http/fetch-client';
import { NETWORK_CONFIG } from '@/config/constants';
import { AppError, ValidationError, NetworkError } from '@/lib/errors';
import { Episode } from '@/types';
import { createContextLogger } from '@/lib/logger';

const adapterLogger = createContextLogger('kakuyomu-adapter');

// HTML文字列をそのまま受け取る
type KakuyomuResponse = string;

export class KakuyomuAdapter extends BaseNovelSiteAdapter<KakuyomuResponse> {
  readonly siteName = 'カクヨム';
  readonly siteId = 'kakuyomu';
  private static readonly WORK_URL_PATTERN = /^https?:\/\/kakuyomu\.jp\/works\/\d+$/;
  private static readonly EPISODE_URL_PATTERN = /^https?:\/\/kakuyomu\.jp\/works\/\d+\/episodes\/\d+$/;

  // DOMセレクター定義
  private static readonly SELECTORS = {
    TITLE: 'h1',
    AUTHOR: '.partialGiftWidgetActivityName',
    EPISODE_CONTENT: '.widget-episodeBody',
    CONTENT_TITLE: '.widget-episodeTitle'
  } as const;

  private static readonly CLASS_PREFIX = {
    GROUP: 'NewBox_padding',
    EPISODE_LINK: 'WorkTocSection_link',
    EPISODE_TITLE: 'WorkTocSection_title'
  } as const;

  constructor() {
      const httpClient = new FetchHttpClient(
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
    super(httpClient);
    adapterLogger.debug('KakuyomuAdapter初期化完了');
  }

  isCompatible(url: string): boolean {
    const compatible = this.validateUrl(url);
    adapterLogger.debug('URL互換性チェック', { url, compatible });
    return compatible;
  }

  protected async fetchContent(url: string): Promise<HttpResponse<KakuyomuResponse>> {
    adapterLogger.info('コンテンツ取得開始', { url });
    try {
      const response = await this.httpClient.get<string>(url);
      adapterLogger.info('コンテンツ取得成功', { url });
      return response;  // text/htmlの文字列をそのまま返す
    } catch (error) {
      adapterLogger.error('コンテンツ取得失敗', {
        url,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message
        } : 'Unknown error'
      });
      throw error;
    }
  }

  async fetchEpisodeList(url: string): Promise<EpisodeListResult> {
    adapterLogger.info('エピソードリスト取得開始', { url });
    try {
      if (!this.validateUrl(url)) {
        adapterLogger.warn('無効なURL', { url });
        throw new ValidationError('無効なURLです', {
          url: ['カクヨムの作品URLではありません']
        });
      }

      const normalizedUrl = this.normalizeUrl(url);
      adapterLogger.debug('URL正規化完了', { 
        originalUrl: url,
        normalizedUrl 
      });

      const response = await this.fetchContent(normalizedUrl);
      const content = response.data;
      if (!content) {
        adapterLogger.error('コンテンツが空', { url: normalizedUrl });
        throw new NetworkError('コンテンツの取得に失敗しました', true);
      }

      const doc = new DOMParser().parseFromString(content, 'text/html');
      const { workTitle, author, episodes } = this.parseWorkInfo(doc);

      if (episodes.length === 0) {
        adapterLogger.error('エピソードリストのパース失敗', { url: normalizedUrl });
        throw new AppError('エピソードリストがパースできませんでした', 'GENERAL_ERROR');
      }

      adapterLogger.info('エピソードリスト取得成功', {
        url: normalizedUrl,
        workTitle,
        author,
        episodeCount: episodes.length
      });

      return {
        success: true,
        workTitle,
        author,
        episodes,
        error: null
      };
    } catch (error) {
      adapterLogger.error('エピソードリスト取得エラー', {
        url,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message
        } : 'Unknown error'
      });

      if (error instanceof AppError) {
        const response = error.toResponse();
        return this.createErrorResult(response.error.message);
      }
      return this.createErrorResult(
        error instanceof Error ? error.message : '不明なエラーが発生しました'
      );
    }
  }

  async fetchEpisodeContent(url: string): Promise<EpisodeContentResult> {
    adapterLogger.info('エピソード内容取得開始', { url });
    try {
      if (!this.validateEpisodeUrl(url)) {
        adapterLogger.warn('無効なエピソードURL', { url });
        throw new ValidationError('無効なエピソードURLです', {
          url: ['カクヨムのエピソードURLではありません']
        });
      }

      const normalizedUrl = this.normalizeEpisodeUrl(url);
      adapterLogger.debug('エピソードURL正規化完了', {
        originalUrl: url,
        normalizedUrl
      });

      const response = await this.fetchContent(normalizedUrl);
      const content = response.data;
      if (!content) {
        adapterLogger.error('エピソード内容が空', { url: normalizedUrl });
        throw new NetworkError('コンテンツの取得に失敗しました', true);
      }

      const doc = new DOMParser().parseFromString(content, 'text/html');
      const { title, content: parsedContent } = this.parseEpisodeContent(doc);

      adapterLogger.info('エピソード内容取得成功', {
        url: normalizedUrl,
        title,
        contentLength: parsedContent.length
      });

      return {
        success: true,
        title,
        content: parsedContent,
        error: null
      };
    } catch (error) {
      adapterLogger.error('エピソード内容取得エラー', {
        url,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message
        } : 'Unknown error'
      });

      if (error instanceof AppError) {
        const response = error.toResponse();
        return this.createEpisodeErrorResult(response.error.message);
      }
      return this.createEpisodeErrorResult(
        error instanceof Error ? error.message : '不明なエラーが発生しました'
      );
    }
  }

  normalizeUrl(url: string): string {
    if (!url) {
      adapterLogger.warn('URLが未指定');
      throw new ValidationError('URLが指定されていません', {
        url: ['URLは必須です']
      });
    }

    try {
      return this.normalizeUrlBase(url);
    } catch {
      adapterLogger.warn('URL正規化失敗', { url });
      throw new ValidationError('無効なURLです', {
        url: ['URLの形式が不正です']
      });
    }
  }

  normalizeEpisodeUrl(url: string): string {
    if (!url) {
      adapterLogger.warn('エピソードURLが未指定');
      throw new ValidationError('URLが指定されていません', {
        url: ['URLは必須です']
      });
    }

    try {
      return this.normalizeUrlBase(url);
    } catch {
      adapterLogger.warn('エピソードURL正規化失敗', { url });
      throw new ValidationError('無効なURLです', {
        url: ['URLの形式が不正です']
      });
    }
  }

  private validateUrl(url: string): boolean {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return KakuyomuAdapter.WORK_URL_PATTERN.test(parsed.toString());
    } catch {
      return false;
    }
  }

  private validateEpisodeUrl(url: string): boolean {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return KakuyomuAdapter.EPISODE_URL_PATTERN.test(parsed.toString());
    } catch {
      return false;
    }
  }

  private normalizeUrlBase(url: string): string {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  }

  private parseWorkInfo(doc: Document): { workTitle: string; author: string; episodes: Episode[] } {
    const titleElement = doc.querySelector(KakuyomuAdapter.SELECTORS.TITLE);
    const authorElement = doc.querySelector(KakuyomuAdapter.SELECTORS.AUTHOR);

    if (!titleElement || !authorElement) {
      adapterLogger.error('作品情報の必須要素が不足');
      throw new AppError('必要な要素が見つかりません', 'PARSER_ERROR');
    }

    const workTitle = titleElement.textContent?.trim() ?? '';
    const author = authorElement.textContent?.trim() ?? '';

    // エピソードリストの取得
    const episodeMap = new Map<string, Episode>();
    const episodeGroups = Array.from(doc.getElementsByTagName('div'))
      .filter(el => Array.from(el.classList)
        .some(className => className.startsWith(KakuyomuAdapter.CLASS_PREFIX.GROUP)));

    if (episodeGroups.length === 0) {
      adapterLogger.error('エピソードグループが不在');
      throw new AppError('エピソードグループが見つかりません', 'PARSER_ERROR');
    }

    episodeGroups.forEach(group => {
      const groupTitle = group.querySelector('h3, h4')?.textContent?.trim();
      const episodeLinks = Array.from(group.getElementsByTagName('a'))
        .filter(el => Array.from(el.classList)
          .some(className => className.startsWith(KakuyomuAdapter.CLASS_PREFIX.EPISODE_LINK)));

      adapterLogger.debug('エピソードグループ解析', {
        groupTitle,
        linkCount: episodeLinks.length
      });

      episodeLinks.forEach(link => {
        try {
          const episode = this.parseEpisodeElement(link, groupTitle);
          const existingEpisode = episodeMap.get(episode.url);
          if (!existingEpisode || (existingEpisode && !existingEpisode.groupTitle && groupTitle)) {
            episodeMap.set(episode.url, episode);
          }
        } catch (error) {
          adapterLogger.warn('エピソード要素の解析失敗', {
            error: error instanceof Error ? error.message : 'Unknown error',
            groupTitle
          });
        }
      });
    });

    return {
      workTitle,
      author,
      episodes: Array.from(episodeMap.values())
    };
  }

  private parseEpisodeElement(element: Element, groupTitle?: string): Episode {
    const href = element.getAttribute('href');
    if (!href) {
      throw new AppError('エピソードのURLが見つかりません', 'PARSER_ERROR');
    }

    const titleElement = Array.from(element.getElementsByTagName('*'))
      .find(el => Array.from(el.classList)
        .some(className => className.startsWith(KakuyomuAdapter.CLASS_PREFIX.EPISODE_TITLE)));

    const dateElement = element.querySelector('time');

    if (!titleElement || !dateElement) {
      adapterLogger.error('エピソード要素の必須要素が不足', { href });
      throw new AppError('エピソードの必須要素が見つかりません', 'PARSER_ERROR');
    }

    const episodeId = href.split('/').pop() ?? 'unknown';
    const episodeUrl = `https://kakuyomu.jp${href}`;
    const episodeTitle = titleElement.textContent?.trim() ?? '';
    const datetime = dateElement.getAttribute('datetime') ?? '';

    return {
      id: episodeId,
      title: episodeTitle,
      groupTitle,
      url: episodeUrl,
      date: datetime,
      selected: false
    };
  }

  private parseEpisodeContent(doc: Document): { title: string; content: string } {
    const titleElement = doc.querySelector(KakuyomuAdapter.SELECTORS.CONTENT_TITLE);
    const contentElement = doc.querySelector(KakuyomuAdapter.SELECTORS.EPISODE_CONTENT);

    if (!titleElement?.textContent?.trim()) {
      adapterLogger.error('エピソードタイトルが不在');
      throw new AppError('エピソードタイトルが見つかりません', 'PARSER_ERROR');
    }

    if (!contentElement) {
      adapterLogger.error('エピソード本文が不在');
      throw new AppError('本文が見つかりません', 'PARSER_ERROR');
    }

    return {
      title: titleElement.textContent.trim(),
      content: contentElement.innerHTML.trim()
    };
  }
}