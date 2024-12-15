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
      return response;
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

      // HTML文字列をパース（基本的な検証はfetch-client側で実施済み）
      const doc = new DOMParser().parseFromString(content, 'text/html');
      const { workTitle, author, episodes } = this.parseWorkInfo(doc);

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

      // HTML文字列をパース（基本的な検証はfetch-client側で実施済み）
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
    // タイトル要素のチェック
    const titleElement = doc.querySelector(KakuyomuAdapter.SELECTORS.TITLE);
    if (!titleElement?.textContent?.trim()) {
      adapterLogger.error('タイトル要素が不在または空');
      throw new AppError('タイトルが見つかりません', 'PARSER_ERROR');
    }

    // 著者要素のチェック
    const authorElement = doc.querySelector(KakuyomuAdapter.SELECTORS.AUTHOR);
    if (!authorElement?.textContent?.trim()) {
      adapterLogger.error('著者名要素が不在または空');
      throw new AppError('著者名が見つかりません', 'PARSER_ERROR');
    }

    adapterLogger.debug('基本情報を検出', {
      title: titleElement.textContent.trim(),
      author: authorElement.textContent.trim()
    });
    
    const workTitle = titleElement.textContent.trim();
    const author = authorElement.textContent.trim();

    // エピソードの解析
    const episodes = this.parseEpisodes(doc);

    // 全エピソードの解析が失敗した場合は例外を投げる
    if (episodes.length === 0) {
      adapterLogger.error('有効なエピソードが見つかりません');
      throw new AppError('エピソードの解析に失敗しました', 'PARSER_ERROR');
    }

    return { workTitle, author, episodes };
  }

  private findEpisodeLinks(group: Element): Element[] {
    const links = Array.from(group.getElementsByTagName('a'))
      .filter(el => Array.from(el.classList)
        .some(className => className.startsWith(KakuyomuAdapter.CLASS_PREFIX.EPISODE_LINK)));

    adapterLogger.debug('エピソードリンク検出', {
      groupId: group.id,
      linkCount: links.length
    });

    return links;
  }

  private parseEpisodes(doc: Document): Episode[] {
    const episodeMap = new Map<string, Episode>();
    let parseSuccessCount = 0;

    // エピソードグループの取得
    const episodeGroups = Array.from(doc.getElementsByTagName('div'))
      .filter(el => Array.from(el.classList)
        .some(className => className.startsWith(KakuyomuAdapter.CLASS_PREFIX.GROUP)));

    // メインコンテンツ領域の存在チェック
    if (episodeGroups.length === 0) {
      adapterLogger.error('メインコンテンツが不在');
      throw new AppError('コンテンツ領域が見つかりません', 'PARSER_ERROR');
    }

    episodeGroups.forEach((group, groupIndex) => {
      const groupTitle = group.querySelector('h3, h4')?.textContent?.trim();
      const episodeLinks = this.findEpisodeLinks(group);

      adapterLogger.debug('エピソードグループ解析', {
        groupTitle,
        linkCount: episodeLinks.length,
        groupIndex
      });

      episodeLinks.forEach((link, index) => {
        try {
          const episode = this.parseEpisodeElement(link, groupTitle);
          const existingEpisode = episodeMap.get(episode.url);
          
          // 既存のエピソードより優先度が高い場合のみ更新
          if (!existingEpisode || (!existingEpisode.groupTitle && groupTitle)) {
            episodeMap.set(episode.url, {
              ...episode,
              order: groupIndex * 1000 + index  // グループ順とエピソード順を保持
            });
            parseSuccessCount++;
          }
        } catch (error) {
          adapterLogger.warn('エピソード要素の解析失敗', {
            error: error instanceof Error ? error.message : 'Unknown error',
            groupTitle,
            groupIndex,
            linkIndex: index
          });
        }
      });
    });

    // 解析成功率のログ出力
    const totalEpisodes = Array.from(episodeGroups)
      .flatMap(group => this.findEpisodeLinks(group)).length;
    
    adapterLogger.info('エピソード解析完了', {
      totalEpisodes,
      successCount: parseSuccessCount,
      successRate: `${(parseSuccessCount / totalEpisodes * 100).toFixed(1)}%`
    });

    // 順序を保持したまま配列に変換して返却
    return Array.from(episodeMap.values())
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  private parseEpisodeElement(element: Element, groupTitle?: string): Episode {
    const href = element.getAttribute('href');
    if (!href) {
      adapterLogger.error('エピソードURLが不在');
      throw new AppError('エピソードのURLが見つかりません', 'PARSER_ERROR');
    }

    const titleElement = Array.from(element.getElementsByTagName('*'))
      .find(el => Array.from(el.classList)
        .some(className => className.startsWith(KakuyomuAdapter.CLASS_PREFIX.EPISODE_TITLE)));

    const dateElement = element.querySelector('time');

    if (!titleElement?.textContent?.trim()) {
      adapterLogger.error('エピソードタイトルが不在または空', { href });
      throw new AppError('エピソードのタイトルが見つかりません', 'PARSER_ERROR');
    }

    if (!dateElement?.getAttribute('datetime')) {
      adapterLogger.error('エピソード日時が不在', {
        href,
        title: titleElement.textContent.trim()
      });
      throw new AppError('エピソードの公開日時が見つかりません', 'PARSER_ERROR');
    }

    const episodeId = href.split('/').pop() ?? 'unknown';
    const episodeUrl = `https://kakuyomu.jp${href}`;
    const episodeTitle = titleElement.textContent.trim();
    const datetime = dateElement.getAttribute('datetime') ?? '';

    adapterLogger.debug('エピソード要素解析完了', {
      id: episodeId,
      title: episodeTitle,
      url: episodeUrl,
      date: datetime,
      groupTitle
    });

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
    // タイトル要素のチェック
    const titleElement = doc.querySelector(KakuyomuAdapter.SELECTORS.CONTENT_TITLE);
    if (!titleElement?.textContent?.trim()) {
      adapterLogger.error('エピソードタイトルが不在または空');
      throw new AppError('エピソードタイトルが見つかりません', 'PARSER_ERROR');
    }

    // 本文要素のチェック
    const contentElement = doc.querySelector(KakuyomuAdapter.SELECTORS.EPISODE_CONTENT);
    if (!contentElement?.innerHTML?.trim()) {
      adapterLogger.error('エピソード本文が不在または空', {
        title: titleElement.textContent.trim()
      });
      throw new AppError('本文が見つかりません', 'PARSER_ERROR');
    }

    const title = titleElement.textContent.trim();
    const content = contentElement.innerHTML.trim();

    adapterLogger.debug('エピソード内容解析完了', {
      title,
      contentLength: content.length
    });

    return { title, content };
  }
}