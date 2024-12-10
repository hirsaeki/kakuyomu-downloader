/**
 * ログレベルの定義
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * ログエントリの型定義
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context?: string;
  message: string;
  data?: unknown;
}

/**
 * ロガーの設定
 */
export interface LogConfig {
  isDebugMode: boolean;
  maxBufferSize: number;
  autoSaveInterval: number;
  maxStorageSize: number;
}

/**
 * 基本的なロガーのインターフェース
 */
export interface ILogger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, error?: Error | unknown): void;
}

/**
 * コンテキストロガーのインターフェース
 */
export interface IContextLogger extends ILogger {
  context: string;
}