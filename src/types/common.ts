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
 * Download Types
 */
// ダウンロード状態の型定義
export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'error';

export interface EpisodeStatus {
  status: DownloadStatus;
  error: string | null;
}

/**
 * Episode Types
 */
// エピソードの基本情報（パース結果）
export interface Episode {
  // 必須フィールド
  id: string;               // エピソードの一意識別子
  title: string;            // エピソードのタイトル
  url: string;              // エピソードのURL
  date: string;             // 公開日
  // オプショナルフィールド
  groupTitle?: string;      // 所属するグループ名（短編集など）
  order?: number;           // エピソードの表示順序（オプション）
  content?: string;         // ダウンロード済みのコンテンツ（オプション）
  selected?: boolean;       // ui上の選択状況
  status?: EpisodeStatus;
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