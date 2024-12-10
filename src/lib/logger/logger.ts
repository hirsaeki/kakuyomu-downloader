import type { LogLevel, LogEntry, LogConfig, ILogger } from './types';
import type { ILogStorage } from './storage';
import type { ILogFormatter } from './formatter';
import { DefaultLogFormatter } from './formatter';
import { LocalStorageAdapter } from './storage';

const DEFAULT_CONFIG: Required<LogConfig> = {
  isDebugMode: process.env.NODE_ENV === 'development',
  maxBufferSize: 1000,
  autoSaveInterval: 5 * 60 * 1000, // 5分
  maxStorageSize: 10000
};

export class Logger implements ILogger {
  private static instance: Logger;
  private logBuffer: LogEntry[] = [];
  private readonly config: Required<LogConfig>;
  private autoSaveTimer?: number;

  private constructor(
    private readonly storage: ILogStorage,
    private readonly formatter: ILogFormatter,
    config?: Partial<LogConfig>
  ) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config
    };
    this.setupAutoSave();
  }

  static getInstance(
    storage?: ILogStorage,
    formatter?: ILogFormatter,
    config?: Partial<LogConfig>
  ): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(
        storage || new LocalStorageAdapter('application_logs', DEFAULT_CONFIG.maxStorageSize),
        formatter || new DefaultLogFormatter(),
        config
      );
    }
    return Logger.instance;
  }

  private setupAutoSave(): void {
    // 既存のタイマーをクリア
    if (this.autoSaveTimer) {
      window.clearInterval(this.autoSaveTimer);
    }

    // 新しいタイマーを設定
    this.autoSaveTimer = window.setInterval(() => {
      if (this.logBuffer.length > 0) {
        void this.flushBuffer();
      }
    }, this.config.autoSaveInterval);

    // ページアンロード時にバッファをフラッシュ
    window.addEventListener('beforeunload', () => {
      if (this.logBuffer.length > 0) {
        void this.flushBuffer();
      }
    });
  }

  private async flushBuffer(): Promise<void> {
    const entries = [...this.logBuffer];
    this.logBuffer = [];
    await this.storage.save(entries);
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.isDebugMode) {
      return level === 'warn' || level === 'error';
    }
    return true;
  }

  private log(level: LogLevel, message: string, context?: string, data?: unknown): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry = this.formatter.format(level, message, context, data);
    
    // 開発環境でのみコンソールに出力
    if (this.config.isDebugMode) {
      const logData = data instanceof Error ? {
        name: data.name,
        message: data.message,
        stack: data.stack
      } : data;

      // eslint-disable-next-line no-console
      console[level](
        `[${entry.timestamp}] ${level.toUpperCase()}${context ? ` [${context}]` : ''}: ${message}`,
        logData
      );
    }

    this.logBuffer.push(entry);
    
    if (this.logBuffer.length >= this.config.maxBufferSize) {
      void this.flushBuffer();
    }
  }

  debug(message: string, data?: unknown): void {
    if (this.config.isDebugMode) {
      this.log('debug', message, undefined, data);
    }
  }

  info(message: string, data?: unknown): void {
    if (this.config.isDebugMode) {
      this.log('info', message, undefined, data);
    }
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, undefined, data);
  }

  error(message: string, error?: Error | unknown): void {
    this.log('error', message, undefined, error);
  }

  logWithContext(level: LogLevel, context: string, message: string, data?: unknown): void {
    this.log(level, message, context, data);
  }

  async downloadLogs(): Promise<void> {
    try {
      await this.flushBuffer();  // 未保存のログを保存
      const blob = await this.storage.export();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `novel-downloader-logs-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      if (this.config.isDebugMode) {
        console.error('Failed to download logs:', error);
      }
    }
  }

  async clearLogs(): Promise<void> {
    this.logBuffer = [];
    await this.storage.clear();
  }
}