import db from './database';
import { BaseNovelSiteAdapter, EpisodeListResult, EpisodeContentResult } from '@/adapters';
import { ValidationError, NetworkError, DatabaseError } from '@/lib/errors';
import { Episode, EpisodeRecord, EpisodeStatus } from '@/types';
import { NETWORK_CONFIG } from '@/config/constants';
import { createContextLogger } from './logger';

const fetchLogger = createContextLogger('NovelFetcher');

/**
 * エピソードをDBレコード形式に変換する関数
 */
function convertToEpisodeRecord(episode: Episode, workUrl: string, index: number): EpisodeRecord {
  const now = new Date();
  return {
    ...episode,
    id: episode.id,
    workUrl,
    lastAccessed: now,
    lastModified: now,
    order: index,
    status: { status: 'pending', error: null }  // デフォルトのステータス設定
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
 * エピソードの状態更新
 */
export const updateEpisodeStatus = async (
  workUrl: string,
  episodeId: string,
  status: EpisodeStatus
): Promise<void> => {
  try {
    await db.updateEpisodeStatus(workUrl, episodeId, status);
    fetchLogger.info(`Updated episode status: ${episodeId}`, { status });
  } catch (error) {
    fetchLogger.error('Failed to update episode status:', error);
    throw error;
  }
};

/**
 * 作品一覧の取得（キャッシュ制御付き）
 */
export const fetchWorkWithCache = async (
  adapter: BaseNovelSiteAdapter<unknown>,
  url: string
): Promise<EpisodeListResult & { fromCache?: boolean }> => {
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
        episodes: cachedEpisodes.map(ep => ({
          ...ep,
          selected: false
        })),
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
      const episodeRecords = result.episodes.map((ep, index) => 
        convertToEpisodeRecord(ep, url, index)
      );
      await db.saveEpisodes(url, episodeRecords);
      fetchLogger.info(`Cached work: ${result.workTitle}`);
    } catch (error) {
      fetchLogger.error('キャッシュ保存エラー:', error);
      throw new DatabaseError(
        'キャッシュの保存に失敗しました。ストレージの空き容量を確認してください。'
      );
    }

    return {
      ...result,
      fromCache: false
    };

  } catch (error) {
    if (error instanceof ValidationError || error instanceof NetworkError || error instanceof DatabaseError) {
      throw error;
    }
    fetchLogger.error('Unexpected error in fetchWorkWithCache:', error);
    throw new DatabaseError(
      error instanceof Error ? error.message : '不明なエラーが発生しました'
    );
  }
};

/**
 * エピソードの取得（キャッシュ制御付き）
 */
export const fetchEpisodeWithCache = async (
  adapter: BaseNovelSiteAdapter<unknown>,
  workUrl: string,
  episodeId: string,
  episodeUrl: string
): Promise<EpisodeContentResult> => {
  if (!episodeUrl) {
    throw new ValidationError('エピソードURLが指定されていません');
  }

  try {
    // 状態を'downloading'に更新
    await updateEpisodeStatus(workUrl, episodeId, { 
      status: 'downloading', 
      error: null 
    });

    // キャッシュの確認
    const cachedContent = await db.getContent(episodeUrl);
    if (cachedContent) {
      // キャッシュヒット時は'completed'に更新
      await updateEpisodeStatus(workUrl, episodeId, {
        status: 'completed',
        error: null
      });

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
      // エラー時の状態更新
      await updateEpisodeStatus(workUrl, episodeId, {
        status: 'error',
        error: result.error || 'エピソードの取得に失敗しました'
      });
      throw new NetworkError(result.error || 'エピソードの取得に失敗しました');
    }

    // キャッシュの保存
    try {
      await db.saveContent(episodeUrl, result.title, result.content);
      // 成功時は'completed'に更新
      await updateEpisodeStatus(workUrl, episodeId, {
        status: 'completed',
        error: null
      });
      fetchLogger.info(`Cached episode: ${result.title}`);
    } catch (error) {
      // キャッシュ保存エラー時の状態更新
      await updateEpisodeStatus(workUrl, episodeId, {
        status: 'error',
        error: 'キャッシュの保存に失敗しました'
      });
      fetchLogger.error('キャッシュ保存エラー:', error);
      throw new DatabaseError(
        'キャッシュの保存に失敗しました。ストレージの空き容量を確認してください。'
      );
    }

    return {
      ...result,
      fromCache: false
    };

  } catch (error) {
    if (error instanceof ValidationError || error instanceof NetworkError || error instanceof DatabaseError) {
      throw error;
    }
    // 予期せぬエラー時の状態更新
    await updateEpisodeStatus(workUrl, episodeId, {
      status: 'error',
      error: error instanceof Error ? error.message : '不明なエラーが発生しました'
    });
    fetchLogger.error('Unexpected error in fetchEpisodeWithCache:', error);
    throw new DatabaseError(
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
  } catch (error) {
    fetchLogger.error('キャッシュ削除エラー:', error);
    throw new DatabaseError(
      'キャッシュの削除に失敗しました。再度お試しください。'
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
  } catch (error) {
    fetchLogger.error('エピソードキャッシュ削除エラー:', error);
    throw new DatabaseError(
      'エピソードキャッシュの削除に失敗しました。'
    );
  }
};