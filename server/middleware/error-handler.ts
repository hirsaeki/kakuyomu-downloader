import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@/types/api';
import { AppError } from '@/types/error';
import { createContextLogger } from '../logger';

const logger = createContextLogger('ErrorHandler');

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const status = (error as AppError).statusCode || 500;
  const type = (error as AppError).type || 'unknown';
  const message = error.message || '不明なエラーが発生しました';

  // エラー情報をログに記録
  logger.error(message, error);

  // クライアントへのレスポンス
  res.status(status).json({
    success: false,
    error: {
      message,
      type,
      statusCode: status
    }
  } satisfies ApiResponse);
}