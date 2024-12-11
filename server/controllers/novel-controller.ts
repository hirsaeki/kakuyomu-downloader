import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@/types/api';
import { SERVER_NETWORK_CONFIG } from '@/config/network';
import { ValidationError } from '@/types/error';
import { fetchWithTimeout } from '@/utils/fetch-client';

// 許可されたドメインの型を定義
type AllowedDomain = typeof SERVER_NETWORK_CONFIG.ALLOWED_DOMAINS[number];

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return SERVER_NETWORK_CONFIG.ALLOWED_DOMAINS.includes(parsed.hostname as AllowedDomain);
  } catch {
    return false;
  }
}

export async function fetchNovelContent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      throw new ValidationError('URLが指定されていません');
    }

    if (!isValidUrl(url)) {
      throw new ValidationError('無効なURLです');
    }

    const response = await fetchWithTimeout(
      url,
      SERVER_NETWORK_CONFIG.TIMEOUTS.REQUEST,
      {
        headers: {
          'User-Agent': SERVER_NETWORK_CONFIG.USER_AGENT,
          'Accept': SERVER_NETWORK_CONFIG.HTTP.HEADERS.ACCEPT.HTML,
          'Accept-Language': SERVER_NETWORK_CONFIG.HTTP.HEADERS.ACCEPT_LANGUAGE,
        }
      }
    );

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('text/html')) {
      throw new ValidationError('不正なコンテンツタイプです');
    }

    const html = await response.text();

    res.json({
      success: true,
      data: {
        content: html,
      }
    } satisfies ApiResponse<{ content: string }>);

  } catch (error) {
    // エラーハンドリングをミドルウェアに委譲
    next(error);
  }
}