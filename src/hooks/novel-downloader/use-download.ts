import { useState, useRef } from 'react';
import { NovelSiteAdapter } from '@/adapters/types';
import { Episode, EpisodeStatus, DownloadedEpisode } from '@/types';
import { fetchEpisodeWithCache, getWaitTime, sleep } from '@/lib/novel-fetcher';
import { EPUBGenerator, EPUBMetadata, InputChapter } from '@/lib/epub/core';
import { createContextLogger } from '@/lib/logger';

const downloadLogger = createContextLogger('download-hook');

export const useDownload = () => {
  const [downloadStatus, setDownloadStatus] = useState<Record<string, EpisodeStatus>>({});
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentProgress, setCurrentProgress] = useState('');
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRequestTimeRef = useRef<number | null>(null);

  const downloadEpisodes = async (
    selectedEpisodes: Episode[],
    workTitle: string,
    author: string,
    showGroupTitles: boolean,
    adapter: NovelSiteAdapter
  ) => {
    if (selectedEpisodes.length === 0) {
      throw new Error('エピソードを選択してください');
    }

    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    setIsDownloading(true);
    const updatedStatus = { ...downloadStatus };
    const downloadedEpisodes: DownloadedEpisode[] = [];

    try {
      const total = selectedEpisodes.length;

      for (let i = 0; i < selectedEpisodes.length; i++) {
        if (signal.aborted) {
          throw new Error('ダウンロードがキャンセルされました');
        }

        const episode = selectedEpisodes[i];
        setCurrentProgress(`${i + 1}/${total} 取得中...`);

        try {
          const waitTime = getWaitTime(lastRequestTimeRef.current);
          if (waitTime > 0) {
            await sleep(waitTime);
          }

          updatedStatus[episode.id] = { status: 'downloading', error: null };
          setDownloadStatus({ ...updatedStatus });

          const result = await fetchEpisodeWithCache(adapter, episode.url);

          if (!result.fromCache) {
            lastRequestTimeRef.current = Date.now();
          }

          updatedStatus[episode.id] = { status: 'completed', error: null };
          downloadedEpisodes.push({
            ...episode,
            content: result.content,
            title: result.title || episode.title
          });

        } catch (error) {
          downloadLogger.error(`Episode download failed: ${episode.title}`, error);
          updatedStatus[episode.id] = {
            status: 'error',
            error: error instanceof Error ? error.message : '不明なエラー'
          };
        }

        setDownloadStatus({ ...updatedStatus });
      }

      if (signal.aborted) {
        throw new Error('ダウンロードがキャンセルされました');
      }

      if (downloadedEpisodes.length === 0) {
        throw new Error('ダウンロードに成功したエピソードがありません');
      }

      setCurrentProgress('EPUB生成中...');
      setIsGenerating(true);

      const inputChapters: InputChapter[] = downloadedEpisodes.map(episode => ({
        title: episode.title,
        data: episode.content,
        metadata: {
          groupTitle: showGroupTitles ? episode.groupTitle : undefined,
          date: episode.date,
          originalUrl: episode.url
        }
      }));

      const metadata: EPUBMetadata = {
        title: workTitle,
        author,
        publisher: 'Kakuyomu Downloader',
        tocTitle: '目次',
        lang: 'ja',
        modifiedDate: new Date().toISOString(),
        content: [] // これはEPUBGenerator内部で設定される
      };

      const epubGenerator = new EPUBGenerator();
      const blob = await epubGenerator.generateEPUB(inputChapters, metadata, {
        aborted: signal.aborted
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${workTitle}.epub`;
      a.click();
      URL.revokeObjectURL(url);

      setCurrentProgress('完了しました');
      setTimeout(() => setCurrentProgress(''), 3000);

    } catch (error) {
      downloadLogger.error('Download process failed', error);
      throw error;
    } finally {
      setIsDownloading(false);
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const cancelDownload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setCurrentProgress('ダウンロードをキャンセルしました');
      setTimeout(() => setCurrentProgress(''), 3000);
    }
  };

  return {
    downloadStatus,
    isDownloading,
    isGenerating,
    currentProgress,
    downloadEpisodes,
    cancelDownload,
    setDownloadStatus
  };
};