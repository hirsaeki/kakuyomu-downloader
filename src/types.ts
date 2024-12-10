/**
 * Novel Downloader Application Types
 * 全ての型定義をまとめたファイル
 */

/**
 * API Response Types
 */
// APIレスポンスに関する型定義
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error: {
    message: string;
    type: ErrorType;
    statusCode?: number;
  } | null;
};

/**
 * Error Types
 * 基本的なエラー型定義
 */
// エラー種別の定義
export type ErrorType =
  | 'validation'   // 入力値検証エラー
  | 'network'      // ネットワークエラー
  | 'general';     // その他の一般エラー


/**
 * Error Classes
 */
// 基底エラークラス
export class NovelDownloaderError extends Error {
  constructor(
    message: string,
    public retriable: boolean = false,
    public type: ErrorType = 'general',
    public statusCode?: number
  ) {
    super(message);
    this.name = 'NovelDownloaderError';
  }
}

// バリデーションエラー
export class ValidationError extends NovelDownloaderError {
  constructor(message: string) {
    super(message, false, 'validation');
    this.name = 'ValidationError';
  }
}

// ネットワークエラー
export class NetworkError extends NovelDownloaderError {
  constructor(message: string, retriable: boolean = true, statusCode?: number) {
    super(message, retriable, 'network', statusCode);
    this.name = 'NetworkError';
  }
}

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
 * Database Types
 */
// 作品のデータベースレコード
export interface WorkRecord extends Work {
  lastModified: Date;  // versionを削除
}

// エピソードのデータベースレコード
export interface EpisodeRecord extends Episode {
  workUrl: string;
  lastAccessed: Date;
  lastModified: Date;  // workVersionを削除
  tags?: string[];
}

// コンテンツのデータベースレコード
export interface ContentRecord {
  episodeUrl: string;
  title: string;
  content: string;
  lastAccessed: Date;
  lastModified: Date;  // versionを削除
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