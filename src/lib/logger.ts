import { DEBUG_CONFIG } from '@/config/constants';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: unknown;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private static instance: Logger;
  private isDebugMode: boolean;
  private logBuffer: LogEntry[] = [];
  private readonly MAX_BUFFER_SIZE = 1000;
  private readonly MAX_STORAGE_SIZE = 10000;
  private readonly STORAGE_KEY = 'application_logs';
  private readonly AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5分

  private constructor() {
    this.isDebugMode = process.env.NODE_ENV === 'development' || DEBUG_CONFIG.FORCE_DEBUG_MODE;
    this.loadLogsFromStorage();
    this.setupAutoSave();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private setupAutoSave(): void {
    setInterval(() => {
      if (this.logBuffer.length > 0) {
        this.saveLogsToStorage();
      }
    }, this.AUTO_SAVE_INTERVAL);

    window.addEventListener('beforeunload', () => {
      this.saveLogsToStorage();
    });
  }

  private saveLogsToStorage(): void {
    try {
      const storedLogs = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
      const updatedLogs = [...storedLogs, ...this.logBuffer]
        .slice(-this.MAX_STORAGE_SIZE);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedLogs));
      this.logBuffer = [];
    } catch (error) {
      console.error('Failed to save logs to storage:', error);
    }
  }

  private loadLogsFromStorage(): void {
    try {
      const storedLogs = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
      const trimmedLogs = storedLogs.slice(-this.MAX_STORAGE_SIZE);
      if (trimmedLogs.length < storedLogs.length) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmedLogs));
      }
      this.logBuffer = [];
    } catch (error) {
      console.error('Failed to load logs from storage:', error);
      this.logBuffer = [];
    }
  }

  async downloadLogs(): Promise<void> {
    try {
      const storedLogs = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
      const allLogs = [...storedLogs, ...this.logBuffer];

      const logData = {
        exportedAt: new Date().toISOString(),
        totalEntries: allLogs.length,
        logs: allLogs
      };

      const blob = new Blob(
        [JSON.stringify(logData, null, 2)],
        { type: 'application/json' }
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `novel-downloader-logs-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download logs:', error);
    }
  }

  clearLogs(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      this.logBuffer = [];
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);
    if (this.logBuffer.length >= this.MAX_BUFFER_SIZE) {
      this.saveLogsToStorage();
    }
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    const entry = this.formatMessage(level, message, data);
    const shouldConsoleLog = this.isDebugMode || level === 'warn' || level === 'error';

    if (shouldConsoleLog) {
      const logData = data instanceof Error ? {
        name: data.name,
        message: data.message,
        stack: data.stack
      } : data;

      const timestamp = entry.timestamp;
      const upperLevel = level.toUpperCase();
      // eslint-disable-next-line no-console
      console[level](`[${timestamp}] ${upperLevel}: ${message}`, logData);
    }

    this.addToBuffer(entry);
  }

  debug(message: string, data?: unknown): void {
    if (this.isDebugMode) {
      this.log('debug', message, data);
    }
  }

  info(message: string, data?: unknown): void {
    if (this.isDebugMode) {
      this.log('info', message, data);
    }
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error | unknown): void {
    this.log('error', message, error);
  }

  logWithContext(level: LogLevel, context: string, message: string, data?: unknown): void {
    this.log(level, `[${context}] ${message}`, data);
  }
}

export const logger = Logger.getInstance();

export function createContextLogger(context: string) {
  return {
    debug: (message: string, data?: unknown) => logger.logWithContext('debug', context, message, data),
    info: (message: string, data?: unknown) => logger.logWithContext('info', context, message, data),
    warn: (message: string, data?: unknown) => logger.logWithContext('warn', context, message, data),
    error: (message: string, data?: unknown) => logger.logWithContext('error', context, message, data)
  };
}