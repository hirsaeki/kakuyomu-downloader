import { Request, Response } from 'express';
import fetch from 'node-fetch';
import { ApiResponse } from '@/types';
import { NETWORK_CONFIG } from '@/config/constants';

// 許可されたドメインの型を定義
type AllowedDomain = typeof NETWORK_CONFIG.ALLOWED_DOMAINS[number];

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return NETWORK_CONFIG.ALLOWED_DOMAINS.includes(parsed.hostname as AllowedDomain);
  } catch {
    return false;
  }
}

export async function fetchNovelContent(req: Request, res: Response): Promise<void> {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          message: 'URLが指定されていません',
          type: 'validation',
          statusCode: 400
        }
      } satisfies ApiResponse);
      return;
    }

    if (!isValidUrl(url)) {
      res.status(400).json({
        success: false,
        error: {
          message: '無効なURLです',
          type: 'validation',
          statusCode: 400
        }
      } satisfies ApiResponse);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, NETWORK_CONFIG.TIMEOUTS.REQUEST);

    const response = await fetch(url, {
      headers: {
        'User-Agent': NETWORK_CONFIG.USER_AGENT,
        'Accept': NETWORK_CONFIG.HTTP.HEADERS.ACCEPT.HTML,
        'Accept-Language': NETWORK_CONFIG.HTTP.HEADERS.ACCEPT_LANGUAGE,
      },
      signal: controller.signal,
      timeout: NETWORK_CONFIG.TIMEOUTS.REQUEST,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorResponse: ApiResponse = {
        success: false,
        error: {
          message: `HTTP error: ${response.status}`,
          type: 'network',
          statusCode: response.status
        }
      };

      res.status(response.status).json(errorResponse);
      return;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('text/html')) {
      res.status(400).json({
        success: false,
        error: {
          message: '不正なコンテンツタイプです',
          type: 'validation',
          statusCode: 400
        }
      } satisfies ApiResponse);
      return;
    }

    const html = await response.text();

    res.json({
      success: true,
      data: {
        content: html,
      }
    } satisfies ApiResponse<{ content: string }>);

  } catch (error) {
    // エラーの種類に応じたステータスコードとメッセージの設定
    let status = 500;
    let message = '不明なエラーが発生しました';
    let type: ApiResponse['error']['type'] = 'unknown';

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        status = 408;
        message = 'リクエストがタイムアウトしました';
        type = 'timeout';
      } else if (error.name === 'FetchError') {
        status = 502;
        message = 'ネットワークエラーが発生しました';
        type = 'network';
      } else {
        message = error.message;
      }
    }

    res.status(status).json({
      success: false,
      error: {
        message,
        type,
        statusCode: status
      }
    } satisfies ApiResponse);
  }
}
