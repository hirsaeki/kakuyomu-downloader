import type { IContextLogger } from '../types';
import { Logger } from '../logger';

export class ContextLogger implements IContextLogger {
  readonly context: string;
  private logger: Logger;

  constructor(context: string, logger: Logger) {
    this.context = context;
    this.logger = logger;
  }

  debug(message: string, data?: unknown): void {
    this.logger.logWithContext('debug', this.context, message, data);
  }

  info(message: string, data?: unknown): void {
    this.logger.logWithContext('info', this.context, message, data);
  }

  warn(message: string, data?: unknown): void {
    this.logger.logWithContext('warn', this.context, message, data);
  }

  error(message: string, error?: Error | unknown): void {
    this.logger.logWithContext('error', this.context, message, error);
  }
}