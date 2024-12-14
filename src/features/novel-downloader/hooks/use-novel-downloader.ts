import { useCallback, useRef, useEffect, useState } from 'react';
import { NovelSiteAdapterFactory } from '@/adapters';
import { fetchEpisodeWithCache, fetchWorkWithCache, clearWorkCache, getWaitTime, sleep } from '@/lib/novel-fetcher';
import { EPUBGenerator } from '@/lib/epub/core';
import type { EPUBMetadata, InputChapter } from '@/lib/epub/core/types';
import { createContextLogger } from '@/lib/logger';
import { type Episode, type EpisodeStatus } from '@/types';
import type { NovelDownloaderState } from '../types';

const logger = createContextLogger('novel-downloader-hook');

/**
 * 小説ダウンロード機能を提供するカスタムフック
 */
export const useNovelDownloader = (factory: NovelSiteAdapterFactory) => {
  // State管理...もう！こんなの朝飯前なんだから！
  const [state, setState] = useState<NovelDownloaderState>({
    url: '',
    episodes: [],
    metadata: {
      workTitle: '',
      author: ''
    },
    currentAdapter: null,
    loading: false,
    error: null,
    downloadStatus: {
      isDownloading: false,
      isGenerating: false,
      progress: {
        current: 0,
        total: 0
      },
      episodes: {},
      message: undefined
    },
    selectAll: false,
    showGroupTitles: true,
    showClearDialog: false
  });

  // 参照系はそのまま...レート制限は大事よ！
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRequestTimeRef = useRef<number | null>(null);

  // URL変更時のアダプター検出
  useEffect(() => {
    if (!state.url) {
      setState(prev => ({ ...prev, currentAdapter: null }));
      return;
    }

    try {
      const adapter = factory.getAdapter(state.url);
      setState(prev => ({ ...prev, currentAdapter: adapter }));
      
      if (!adapter) {
        logger.debug('No compatible adapter found for URL', { url: state.url });
      }
    } catch (error) {
      logger.error('Error detecting adapter', error);
      setState(prev => ({ ...prev, currentAdapter: null, error: 'アダプターの検出に失敗しました' }));
    }
  }, [state.url, factory]);

  // 状態更新のヘルパー...使う側のことも考えなきゃね！
  const updateState = useCallback((partial: Partial<NovelDownloaderState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  const updateDownloadProgress = useCallback((current: number, total: number) => {
    updateState({
      downloadStatus: {
        ...state.downloadStatus,
        progress: { current, total }
      }
    });
  }, [state.downloadStatus, updateState]);

  const updateEpisodeStatus = useCallback((url: string, status: EpisodeStatus) => {
    updateState({
      downloadStatus: {
        ...state.downloadStatus,
        episodes: {
          ...state.downloadStatus.episodes,
          [url]: status
        }
      }
    });
  }, [state.downloadStatus, updateState]);

  // URL関連の操作...こんなの基本よ！
  const setUrl = useCallback((url: string) => {
    updateState({ url, error: null });
  }, [updateState]);

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // エピソード一覧の取得
  const fetchEpisodes = useCallback(async () => {
    if (!state.url || !state.currentAdapter) {
      updateState({ error: 'URLまたはアダプターが無効です' });
      return;
    }

    updateState({ loading: true, error: null });

    try {
      const result = await fetchWorkWithCache(state.currentAdapter, state.url);
      updateState({
        episodes: result.episodes.map(ep => ({ ...ep, selected: false })),
        metadata: {
          workTitle: result.workTitle,
          author: result.author
        }
      });
    } catch (error) {
      logger.error('Failed to fetch episodes', error);
      updateState({
        episodes: [],
        error: error instanceof Error ? error.message : '不明なエラーが発生しました'
      });
    } finally {
      updateState({ loading: false });
    }
  }, [state.url, state.currentAdapter, updateState]);

  // キャッシュ操作...もう！面倒見てあげるわよ！
  const clearCache = useCallback(async () => {
    if (!state.url) return;

    try {
      updateState({ loading: true, error: null });
      await clearWorkCache(state.url);
      updateState({
        episodes: [],
        metadata: { workTitle: '', author: '' },
        showClearDialog: false
      });
    } catch (error) {
      logger.error('Failed to clear cache', error);
      updateState({
        error: error instanceof Error ? error.message : 'キャッシュの削除に失敗しました'
      });
    } finally {
      updateState({ loading: false });
    }
  }, [state.url, updateState]);

  // UI表示制御...ユーザー体験が大事なんだから！
  const setShowGroupTitles = useCallback((show: boolean) => {
    updateState({ showGroupTitles: show });
  }, [updateState]);

  const setShowClearDialog = useCallback((show: boolean) => {
    updateState({ showClearDialog: show });
  }, [updateState]);

  // エピソード選択...完璧な実装になってるんだから！
  const selectAllEpisodes = useCallback((selected: boolean) => {
    updateState({
      selectAll: selected,
      episodes: state.episodes.map(ep => ({ ...ep, selected }))
    });
  }, [state.episodes, updateState]);

  const selectEpisode = useCallback((url: string, selected: boolean) => {
    const newEpisodes = state.episodes.map(ep =>
      ep.url === url ? { ...ep, selected } : ep
    );
    updateState({
      episodes: newEpisodes,
      selectAll: newEpisodes.every(ep => ep.selected)
    });
  }, [state.episodes, updateState]);

  // ダウンロード処理...これが本命なのよ！
  const downloadEpisodes = useCallback(async () => {
    if (!state.currentAdapter) {
      updateState({ error: 'アダプターが無効です' });
      return;
    }

    const selectedEpisodes = state.episodes.filter(ep => ep.selected);
    if (selectedEpisodes.length === 0) {
      updateState({ error: 'エピソードを選択してください' });
      return;
    }

    // ダウンロード制御の初期化
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    // 初期状態の設定...ちゃんとエラーフィールドを追加するわよ！
    const episodeStatuses: Record<string, EpisodeStatus> = {};
    selectedEpisodes.forEach(ep => {
      episodeStatuses[ep.url] = { status: 'pending', error: null };
    });

    updateState({
      downloadStatus: {
        isDownloading: true,
        isGenerating: false,
        progress: {
          current: 0,
          total: selectedEpisodes.length
        },
        episodes: episodeStatuses,
        message: undefined
      },
      error: null
    });

    const downloadedEpisodes: Array<Episode & { content: string }> = [];

    try {
      // エピソードのダウンロード
      for (let i = 0; i < selectedEpisodes.length; i++) {
        if (signal.aborted) {
          throw new Error('ダウンロードがキャンセルされました');
        }

        updateDownloadProgress(i + 1, selectedEpisodes.length);
        const episode = selectedEpisodes[i];

        try {
          // こっちもちゃんとエラーフィールドを追加！
          updateEpisodeStatus(episode.url, { status: 'downloading', error: null });

          // レート制限の考慮
          const waitTime = getWaitTime(lastRequestTimeRef.current);
          if (waitTime > 0) {
            await sleep(waitTime);
          }

          const result = await fetchEpisodeWithCache(state.currentAdapter, episode.url);

          if (!result.fromCache) {
            lastRequestTimeRef.current = Date.now();
          }

          downloadedEpisodes.push({
            ...episode,
            content: result.content,
            title: result.title || episode.title
          });

          // 完了状態も同様よ！
          updateEpisodeStatus(episode.url, { status: 'completed', error: null });

        } catch (error) {
          logger.error(`Episode download failed: ${episode.title}`, error);
          // エラー状態の更新
          updateEpisodeStatus(episode.url, {
            status: 'error',
            error: error instanceof Error ? error.message : '不明なエラー'
          });
          throw error;  // 上位でまとめて処理
        }
      }

      if (signal.aborted) {
        throw new Error('ダウンロードがキャンセルされました');
      }

      if (downloadedEpisodes.length === 0) {
        throw new Error('ダウンロードに成功したエピソードがありません');
      }

      // EPUB生成...完璧な実装よ！
      updateState({
        downloadStatus: {
          ...state.downloadStatus,
          isGenerating: true
        }
      });

      const inputChapters: InputChapter[] = downloadedEpisodes.map(episode => ({
        title: episode.title,
        data: episode.content,
        metadata: {
          groupTitle: state.showGroupTitles ? episode.groupTitle : undefined,
          date: episode.date,
          originalUrl: episode.url
        }
      }));

      const metadata: EPUBMetadata = {
        title: state.metadata.workTitle,
        author: state.metadata.author,
        publisher: 'Kakuyomu Downloader',
        tocTitle: '目次',
        lang: 'ja',
        modifiedDate: new Date().toISOString(),
        content: []  // EPUBGeneratorが自動設定してくれるのよ！
      };

      const epubGenerator = new EPUBGenerator();
      const blob = await epubGenerator.generateEPUB(inputChapters, metadata, {
        aborted: signal.aborted
      });

      // ファイルの保存...ユーザーのことを考えた実装なんだから！
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${state.metadata.workTitle}.epub`;
      a.click();
      URL.revokeObjectURL(url);

      // 完了通知
      updateState({
        downloadStatus: {
          isDownloading: false,
          isGenerating: false,
          progress: { current: 0, total: 0 },
          episodes: {},  // 状態をクリア
          message: '完了しました'
        }
      });

      // 完了メッセージのクリア
      setTimeout(() => {
        updateState({
          downloadStatus: {
            ...state.downloadStatus,
            message: undefined
          }
        });
      }, 3000);

    } catch (error) {
      logger.error('Download process failed', error);
      updateState({
        error: error instanceof Error ? error.message : '不明なエラーが発生しました',
        downloadStatus: {
          isDownloading: false,
          isGenerating: false,
          progress: { current: 0, total: 0 },
          episodes: state.downloadStatus.episodes,  // エラー状態は保持
          message: undefined
        }
      });
    } finally {
      abortControllerRef.current = null;
    }
  }, [
    state.currentAdapter,
    state.episodes,
    state.downloadStatus,
    state.showGroupTitles,
    state.metadata,
    updateState,
    updateDownloadProgress,
    updateEpisodeStatus
  ]);

  // キャンセル処理...ユーザーの操作は大事にしないとね！
  const cancelDownload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;

      updateState({
        downloadStatus: {
          isDownloading: false,
          isGenerating: false,
          progress: { current: 0, total: 0 },
          episodes: {},  // キャンセル時は状態をクリア
          message: 'ダウンロードをキャンセルしました'
        }
      });

      setTimeout(() => {
        updateState({
          downloadStatus: {
            ...state.downloadStatus,
            message: undefined
          }
        });
      }, 3000);
    }
  }, [state.downloadStatus, updateState]);

  return {
    state,
    actions: {
      setUrl,
      fetchEpisodes,
      clearCache,
      setShowGroupTitles,
      setShowClearDialog,
      selectAllEpisodes,
      selectEpisode,
      downloadEpisodes,
      cancelDownload,
      clearError
    }
  };
};

export type NovelDownloaderHook = ReturnType<typeof useNovelDownloader>;