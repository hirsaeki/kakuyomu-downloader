import { useState } from 'react';
import { useDownload } from './use-download';
import { useEpisodes } from './use-episodes';
import { useNovelInfo } from './use-novel-info';
import { createContextLogger } from '@/lib/logger';
import { NovelSiteAdapterFactory } from '@/adapters';

const hookLogger = createContextLogger('novel-downloader-hook');

export const useNovelDownloader = (factory: NovelSiteAdapterFactory) => {
  const [error, setError] = useState<string | null>(null);

  const {
    downloadStatus,
    isDownloading,
    isGenerating,
    currentProgress,
    downloadEpisodes,
    cancelDownload
  } = useDownload();

  const {
    episodes,
    loading,
    isClearing,
    selectAll,
    showGroupTitles,
    showClearDialog,
    fetchEpisodes,
    clearCache,
    handleSelectAll,
    handleSelectEpisode,
    setShowGroupTitles,
    setShowClearDialog,
  } = useEpisodes();

  const {
    url,
    workTitle,
    author,
    currentAdapter,
    setUrl,
    updateMetadata,
    clearMetadata
  } = useNovelInfo(factory);

  const handleFetchEpisodes = async () => {
    if (!url || !currentAdapter) return;

    setError(null);
    try {
      await fetchEpisodes(currentAdapter, url, updateMetadata);
    } catch (error) {
      hookLogger.error('Failed to fetch episodes', error);
      setError(error instanceof Error ? error.message : '不明なエラーが発生しました');
    }
  };

  const handleClearCache = async () => {
    if (!url) return;

    setError(null);
    try {
      await clearCache(url);
      clearMetadata();
    } catch (error) {
      hookLogger.error('Failed to clear cache', error);
      setError(error instanceof Error ? error.message : 'キャッシュのクリアに失敗しました');
    }
  };

  const handleDownload = async () => {
    if (!currentAdapter) return;

    const selectedEpisodes = episodes.filter(ep => ep.selected);
    if (selectedEpisodes.length === 0) {
      setError('エピソードを選択してください');
      return;
    }

    setError(null);
    try {
      await downloadEpisodes(
        selectedEpisodes,
        workTitle,
        author,
        showGroupTitles,
        currentAdapter
      );
    } catch (error) {
      hookLogger.error('Failed to download episodes', error);
      setError(error instanceof Error ? error.message : 'ダウンロードに失敗しました');
    }
  };

  return {
    // State
    url,
    episodes,
    workTitle,
    author,
    loading,
    error,
    downloadStatus,
    currentProgress,
    selectAll,
    showGroupTitles,
    showClearDialog,
    currentAdapter,
    factory,  // これも返しておかないと...
    
    // Flags
    isDownloading,
    isGenerating,
    isClearing,
    
    // Actions
    setUrl,
    handleFetchEpisodes,
    handleSelectAll,
    handleSelectEpisode,
    handleDownload,
    handleClearCache,
    setShowGroupTitles,
    setShowClearDialog,
    cancelDownload,
  } as const;
};