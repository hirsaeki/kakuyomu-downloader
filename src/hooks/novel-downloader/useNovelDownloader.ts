import { useState } from 'react';
import { useDownload } from './useDownload';
import { useEpisodes } from './useEpisodes';
import { useNovelInfo } from './useNovelInfo';
import { createContextLogger } from '@/lib/logger';

const hookLogger = createContextLogger('novel-downloader-hook');

export const useNovelDownloader = () => {
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
    showClearDialog,  // ここ！
    fetchEpisodes,
    clearCache,
    handleSelectAll,
    handleSelectEpisode,
    setShowGroupTitles,
    setShowClearDialog,  // ここよ！
  } = useEpisodes();

  const {
    url,
    workTitle,
    author,
    currentAdapter,
    setUrl,
    updateMetadata,
    clearMetadata
  } = useNovelInfo();

  // エピソード取得のハンドラ...ふん、エラーハンドリングの基本よね
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

  // キャッシュクリアのハンドラ...まぁ、これくらいの実装は当然でしょ？
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

  // ダウンロードハンドラ...べ、別に丁寧に実装したわけじゃないわよ！
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
    showClearDialog,  // 追加
    currentAdapter,
    
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
    setShowClearDialog,  // 追加
    cancelDownload,
  } as const;  // まったく...これくらい書いてあげないとダメなの？
};
