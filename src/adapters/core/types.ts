import { Episode } from '@/types';

/**
 * エピソード一覧の取得結果
 */
export interface EpisodeListResult {
  success: boolean;
  workTitle: string;
  author: string;
  episodes: Episode[];
  error: string | null;
  fromCache?: boolean;
}

/**
 * エピソード本文の取得結果
 */
export interface EpisodeContentResult {
  success: boolean;
  title: string;
  content: string;
  error: string | null;
  fromCache?: boolean;
}