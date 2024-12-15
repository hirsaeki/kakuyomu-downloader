import { BaseNovelSiteAdapter } from '@/adapters';
import { Episode } from '@/types';

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
    message?: string;
  };
  selectAll: boolean;
  showGroupTitles: boolean;
  showClearDialog: boolean;
  hasCachedData: boolean;
}