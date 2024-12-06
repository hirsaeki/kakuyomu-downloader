import { useState, useCallback } from 'react';
import { Episode } from '@/types';
import { NovelSiteAdapter } from '@/adapters/types';
import { fetchWorkWithCache, clearWorkCache } from '@/lib/novelFetcher';
import { createContextLogger } from '@/lib/logger';

const episodeLogger = createContextLogger('episode-hook');

export const useEpisodes = () => {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showGroupTitles, setShowGroupTitles] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);

  // エピソード一覧の取得
  const fetchEpisodes = useCallback(async (
    adapter: NovelSiteAdapter,
    url: string,
    onSuccess: (title: string, author: string) => void
  ) => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchWorkWithCache(adapter, url);
      
      setEpisodes(result.episodes.map(ep => ({ ...ep, selected: false })));
      onSuccess(result.workTitle, result.author);

    } catch (error) {
      episodeLogger.error('Failed to fetch episodes', error);
      setError(error instanceof Error ? error.message : '不明なエラーが発生しました');
      setEpisodes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // キャッシュクリア
  const clearCache = useCallback(async (url: string) => {
    if (!url) return;

    try {
      setIsClearing(true);
      setError(null);

      await clearWorkCache(url);
      setEpisodes([]);
      setShowClearDialog(false);

    } catch (error) {
      episodeLogger.error('Failed to clear cache', error);
      setError(error instanceof Error ? error.message : 'キャッシュの削除に失敗しました');
    } finally {
      setIsClearing(false);
    }
  }, []);

  // エピソード選択の制御
  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectAll(checked);
    setEpisodes(eps => eps.map(ep => ({ ...ep, selected: checked })));
  }, []);

  const handleSelectEpisode = useCallback((index: number, checked: boolean) => {
    setEpisodes(eps => {
      const newEpisodes = eps.map((ep, i) =>
        i === index ? { ...ep, selected: checked } : ep
      );
      setSelectAll(newEpisodes.every(ep => ep.selected));
      return newEpisodes;
    });
  }, []);

  return {
    episodes,
    loading,
    isClearing,
    error,
    selectAll,
    showGroupTitles,
    showClearDialog,
    fetchEpisodes,
    clearCache,
    handleSelectAll,
    handleSelectEpisode,
    setShowGroupTitles,
    setShowClearDialog
  };
};