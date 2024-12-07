import db from './database';
import { NovelSiteAdapter, EpisodeListResult, EpisodeContentResult } from '@/adapters/types';
import { ValidationError, NetworkError, NovelDownloaderError, Episode, EpisodeRecord } from '@/types';
import { NETWORK_CONFIG } from '@/config/constants';
import { createContextLogger } from './logger';

const fetchLogger = createContextLogger('NovelFetcher');

/**
 * エピソードをDBレコード形式に変換する関数
 */
function convertToEpisodeRecord(episode: Episode, workUrl: string): EpisodeRecord {
  const now = new Date();
  return {
    ...episode,
    workUrl,
    lastAccessed: now,
    lastModified: now
  };
}

/**
 * リクエスト間の待機時間を計算
 */
export const getWaitTime = (lastRequestTime: number | null): number => {
  if (!lastRequestTime) {
    return 0;
  }
  const elapsed = Date.now() - lastRequestTime;
  return Math.max(0, NETWORK_CONFIG.REQUEST_INTERVAL - elapsed);
};

/**
 * 指定時間待機
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * 作品一覧の取得（キャッシュ制御付き）
 */
export const fetchWorkWithCache = async (
  adapter: NovelSiteAdapter,
  url: string
): Promise<EpisodeListResult> => {
  if (!adapter.isCompatible(url)) {
    throw new ValidationError('無効なURLです');
  }

  try {
    // キャッシュの確認
    const cachedWork = await db.getWork(url);
    const cachedEpisodes = cachedWork ? await db.getEpisodes(url) : null;

    if (cachedWork && cachedEpisodes && cachedEpisodes.length > 0) {
      return {
        success: true,
        workTitle: cachedWork.workTitle,
        author: cachedWork.author,
        episodes: cachedEpisodes,
        error: null,
        fromCache: true
      };
    }

    // 新規取得
    const result = await adapter.fetchEpisodeList(url);
    if (!result.success) {
      throw new NetworkError(result.error || '作品情報の取得に失敗しました');
    }

    // キャッシュの保存
    try {
      await db.saveWork(url, result.workTitle, result.author);
      // エピソードをDBレコード形式に変換して保存
      const episodeRecords = result.episodes.map(ep => convertToEpisodeRecord(ep, url));
      await db.saveEpisodes(url, episodeRecords);
      fetchLogger.info(`Cached work: ${result.workTitle}`);
    } catch {
      // キャッシュ保存エラーは一時的なものとして扱う（再試行可能）
      throw new NovelDownloaderError(
        'キャッシュの保存に失敗しました。ストレージの空き容量を確認してください。',
        true  // retriable = true
      );
    }

    return {
      ...result,
      fromCache: false
    };

  } catch (error) {
    if (error instanceof ValidationError || error instanceof NetworkError || error instanceof NovelDownloaderError) {
      throw error;
    }
    fetchLogger.error('Unexpected error in fetchWorkWithCache:', error);
    throw new NovelDownloaderError(
      error instanceof Error ? error.message : '不明なエラーが発生しました'
    );
  }
};

/**
 * エピソードの取得（キャッシュ制御付き）
 */
export const fetchEpisodeWithCache = async (
  adapter: NovelSiteAdapter,
  episodeUrl: string
): Promise<EpisodeContentResult> => {
  if (!episodeUrl) {
    throw new ValidationError('エピソードURLが指定されていません');
  }

  try {
    // キャッシュの確認
    const cachedContent = await db.getContent(episodeUrl);
    if (cachedContent) {
      return {
        success: true,
        title: cachedContent.title,
        content: cachedContent.content,
        error: null,
        fromCache: true
      };
    }

    // 新規取得
    const result = await adapter.fetchEpisodeContent(episodeUrl);
    if (!result.success) {
      throw new NetworkError(result.error || 'エピソードの取得に失敗しました');
    }

    // キャッシュの保存
    try {
      await db.saveContent(episodeUrl, result.title, result.content);
      fetchLogger.info(`Cached episode: ${result.title}`);
    } catch {
      // キャッシュ保存エラーは一時的なものとして扱う（再試行可能）
      throw new NovelDownloaderError(
        'キャッシュの保存に失敗しました。ストレージの空き容量を確認してください。',
        true  // retriable = true
      );
    }

    return {
      ...result,
      fromCache: false
    };

  } catch (error) {
    if (error instanceof ValidationError || error instanceof NetworkError || error instanceof NovelDownloaderError) {
      throw error;
    }
    fetchLogger.error('Unexpected error in fetchEpisodeWithCache:', error);
    throw new NovelDownloaderError(
      error instanceof Error ? error.message : '不明なエラーが発生しました'
    );
  }
};

/**
 * キャッシュのクリア
 */
export const clearWorkCache = async (url: string): Promise<void> => {
  try {
    await db.clearWorkCache(url);
    fetchLogger.info(`Cleared cache for work: ${url}`);
  } catch {
    throw new NovelDownloaderError(
      'キャッシュの削除に失敗しました。再度お試しください。',
      true  // retriable = true
    );
  }
};

/**
 * 複数エピソードの一括キャッシュクリア
 */
export const clearEpisodesCache = async (episodes: Episode[]): Promise<void> => {
  try {
    const episodeUrls = episodes.map(ep => ep.url);
    await Promise.all(
      episodeUrls.map(url => 
        db.getContent(url).then(content => {
          if (content) {
            return db.contents.delete(url);
          }
        })
      )
    );
    fetchLogger.info(`Cleared cache for ${episodeUrls.length} episodes`);
  } catch {
    throw new NovelDownloaderError(
      'エピソードキャッシュの削除に失敗しました。',
      true
    );
  }
};