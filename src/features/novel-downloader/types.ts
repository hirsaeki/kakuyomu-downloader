import { BaseNovelSiteAdapter } from '@/adapters';
import { Episode, EpisodeStatus } from '@/types';

export interface NovelDownloaderState {
  url: string;
  episodes: Episode[];
  metadata: {
    workTitle: string;
    author: string;
  };
  currentAdapter: BaseNovelSiteAdapter<unknown> | null;
  loading: boolean;
  error: string | null;
  downloadStatus: {
    isDownloading: boolean;
    isGenerating: boolean;
    progress: {
      current: number;
      total: number;
    };
    episodes: Record<string, EpisodeStatus>;
    message?: string;
  };
  selectAll: boolean;
  showGroupTitles: boolean;
  showClearDialog: boolean;
  hasCachedData: boolean;  // 追加: キャッシュの有無を表す状態
};