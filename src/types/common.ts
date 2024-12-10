/**
 * Novel Downloader Application Types
 * 全ての型定義をまとめたファイル
 */
import { ErrorCode } from '../lib/errors';

/**
 * API Response Types
 */
// APIレスポンスに関する型定義
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error: {
    message: string;
    code: ErrorCode;
    statusCode?: number;
    retriable?: boolean;
    details?: Record<string, string[]>;
  } | null;
};

/**
 * Episode Types
 */
// エピソードの基本情報
export interface Episode {
  id: string;           // エピソードの一意識別子
  title: string;        // エピソードのタイトル
  groupTitle?: string;  // 所属するグループ名（短編集など）
  url: string;          // エピソードのURL
  date: string;         // 公開日
  selected: boolean;    // UI上での選択状態
  content?: string;     // ダウンロード済みのコンテンツ（オプション）
}

// ダウンロード済みエピソード
export interface DownloadedEpisode extends Episode {
  content: string;  // 必須フィールドとして上書き
}

/**
 * Work Types
 */
// 作品の基本情報
export interface Work {
  url: string;         // 作品のURL
  workTitle: string;   // 作品タイトル
  author: string;      // 作者名
  lastAccessed: Date;  // 最終アクセス日時
}

/**
 * Download Types
 */
// ダウンロード状態の型定義
export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'error';

export interface EpisodeStatus {
  status: DownloadStatus;
  error: string | null;
}