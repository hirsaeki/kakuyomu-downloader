import winston from 'winston';
import path from 'path';

// ログ出力ディレクトリの設定
const LOG_DIR = 'logs';
const LOG_FILE = path.join(LOG_DIR, 'server.log');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'error.log');

// ログフォーマットの定義
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// ロガーの設定
const logger = winston.createLogger({
  format: logFormat,
  transports: [
    // 通常のログはserver.logに
    new winston.transports.File({ 
      filename: LOG_FILE,
      level: 'info'
    }),
    // エラーログは別ファイルにも
    new winston.transports.File({ 
      filename: ERROR_LOG_FILE,
      level: 'error'
    }),
    // 開発時は標準出力にも表示
    ...(process.env.NODE_ENV === 'development' ? [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ] : [])
  ]
});

// ログローテーションの設定（オプション）
import 'winston-daily-rotate-file';

const dailyRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(LOG_DIR, 'server-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d',  // 14日分保持
  maxSize: '20m'    // ファイルサイズ上限
});

logger.add(dailyRotateTransport);

export { logger };

// コンテキストロガーの作成ヘルパー
export function createContextLogger(context: string) {
  return {
    debug: (message: string, meta?: object) => {
      logger.debug(message, { context, ...meta });
    },
    info: (message: string, meta?: object) => {
      logger.info(message, { context, ...meta });
    },
    warn: (message: string, meta?: object) => {
      logger.warn(message, { context, ...meta });
    },
    error: (message: string, error?: Error | unknown) => {
      const errorData = error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error;
      logger.error(message, { context, error: errorData });
    }
  };
}
