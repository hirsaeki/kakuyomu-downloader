// サーバー側のエラー型定義
export interface AppError extends Error {
  statusCode?: number;
  type?: string;
}

export class ValidationError extends Error implements AppError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    this.type = 'validation';
    this.statusCode = 400;
  }
  type: string;
  statusCode: number;
}

export class NetworkError extends Error implements AppError {
  constructor(message: string, status: number) {
    super(message);
    this.name = 'NetworkError';
    this.type = 'network';
    this.statusCode = status;
  }
  type: string;
  statusCode: number;
}