/* eslint-disable no-console */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

type LogFunction = (message: string, ctx?: LogContext) => void;

interface Logger {
  debug: LogFunction;
  info: LogFunction;
  warn: LogFunction;
  error: LogFunction;
}

export function createLogger(context: string): Logger {
  const formatMessage = (level: LogLevel, message: string, ctx: LogContext = {}) => {
    const contextStr = Object.keys(ctx).length > 0
      ? ` ${JSON.stringify(ctx)}`
      : '';
    return `[${context}] [${level.toUpperCase()}] ${message}${contextStr}`;
  };

  const shouldLog = (level: LogLevel): boolean => {
    if (level === 'warn' || level === 'error') return true;
    return process.env.NODE_ENV !== 'production';
  };

  const createLogFunction = (level: LogLevel): LogFunction => {
    return (message: string, ctx: LogContext = {}) => {
      if (shouldLog(level)) {
        console[level](formatMessage(level, message, ctx));
      }
    };
  };

  return {
    debug: createLogFunction('debug'),
    info: createLogFunction('info'),
    warn: createLogFunction('warn'),
    error: createLogFunction('error')
  };
}