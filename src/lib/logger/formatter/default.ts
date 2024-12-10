import type { LogLevel, LogEntry } from '../types';
import type { ILogFormatter } from './types';

export class DefaultLogFormatter implements ILogFormatter {
  format(
    level: LogLevel,
    message: string,
    context?: string,
    data?: unknown
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      data: this.sanitizeData(data)
    };
  }

  private sanitizeData(data: unknown): unknown {
    if (data instanceof Error) {
      return {
        name: data.name,
        message: data.message,
        stack: data.stack
      };
    }
    return data;
  }
}