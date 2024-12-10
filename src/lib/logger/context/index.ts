import { Logger } from '../logger';
import { ContextLogger } from './logger';

export function createContextLogger(context: string): ContextLogger {
  return new ContextLogger(context, Logger.getInstance());
}

export * from './logger';