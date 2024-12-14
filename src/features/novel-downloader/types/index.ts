import { BaseNovelSiteAdapter } from '@/adapters';
import { Episode, EpisodeStatus as CommonEpisodeStatus } from '@/types';
import { NovelSiteAdapterFactory } from '@/adapters';

export interface NovelMetadata {
  workTitle: string;
  author: string;
}

export interface DownloadProgress {
  current: number;
  total: number;
}

export interface DownloadStatus {
  isDownloading: boolean;
  isGenerating: boolean;
  progress: DownloadProgress;
  message?: string;
  episodes: Record<string, CommonEpisodeStatus>;
}

export interface NovelDownloaderState {
  url: string;
  episodes: Episode[];
  metadata: NovelMetadata;
  currentAdapter: BaseNovelSiteAdapter | null;
  loading: boolean;
  error: string | null;
  downloadStatus: DownloadStatus;
  selectAll: boolean;
  showGroupTitles: boolean;
  showClearDialog: boolean;
}
export type NovelDownloaderHookResult = {
  // State
  url: string;
  episodes: Episode[];
  workTitle: string;
  author: string;
  loading: boolean;
  error: string | null;
  downloadStatus: Record<string, DownloadStatus>;
  currentProgress: string;
  selectAll: boolean;
  showGroupTitles: boolean;
  showClearDialog: boolean;
  currentAdapter: BaseNovelSiteAdapter | null;
  factory: NovelSiteAdapterFactory;

  // Flags
  isDownloading: boolean;
  isGenerating: boolean;
  isClearing: boolean;

  // Actions
  setUrl: (url: string) => void;
  handleFetchEpisodes: () => Promise<void>;
  handleSelectAll: () => void;
  handleSelectEpisode: (episodeId: string, selected: boolean) => void;
  handleDownload: () => Promise<void>;
  handleClearCache: () => Promise<void>;
  setShowGroupTitles: (show: boolean) => void;
  setShowClearDialog: (show: boolean) => void;
  cancelDownload: () => void;
};