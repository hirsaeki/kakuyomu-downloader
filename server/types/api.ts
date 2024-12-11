// サーバー側のAPI型定義
export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    type: string;
    statusCode: number;
  };
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;