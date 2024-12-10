import type { LogLevel, LogEntry } from '../types';

export interface ILogFormatter {
  /**
   * ログエントリをフォーマット
   */
  format(
    level: LogLevel,
    message: string,
    context?: string,
    data?: unknown
  ): LogEntry;
}