// 必要な型定義のみをエクスポート
export type { LogLevel, LogEntry } from './types';

// シングルトンインスタンスとコンテキストロガー生成関数のみをエクスポート
import { Logger } from './logger';
export { createContextLogger } from './context';
export const logger = Logger.getInstance();