import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import { access, mkdir } from 'fs/promises';

const LOG_DIR = process.env.LOG_DIR ?? './logs';
const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info';
const LOG_MAX_SIZE = process.env.LOG_MAX_SIZE ?? '10m';
const LOG_MAX_FILES = process.env.LOG_MAX_FILES ?? '14d';

// ログディレクトリの作成
try {
  await access(LOG_DIR)
} catch  {
  await mkdir(LOG_DIR, { recursive: true })
}

const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // コンソール出力
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // 通常ログ（日次ローテーション）
    new winston.transports.DailyRotateFile({
      filename: path.join(LOG_DIR, 'proxy-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: LOG_MAX_SIZE,
      maxFiles: LOG_MAX_FILES,
      auditFile: path.join(LOG_DIR, '.audit.json')
    }),
    // エラーログ（日次ローテーション）
    new winston.transports.DailyRotateFile({
      filename: path.join(LOG_DIR, 'proxy-error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: LOG_MAX_SIZE,
      maxFiles: LOG_MAX_FILES,
      level: 'error',
      auditFile: path.join(LOG_DIR, '.audit-error.json')
    })
  ]
});

export { logger };