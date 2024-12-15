import express from 'express';
import type { RequestHandler } from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { logger } from './logger';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());

// プロキシ設定
// CORSに必要なヘッダーセット
const ALLOWED_HEADERS = [
  'Content-Type',
  'Content-Length',
  'Last-Modified',
  'ETag',
  'Cache-Control'
];

const proxyHandler: RequestHandler = async (req, res) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    logger.warn('URLパラメータが見つかりません');
    res.status(400).send('URLが必要です');
    return;
  }

  try {
    logger.info(`プロキシリクエスト: ${url}`);
    const response = await fetch(url);

    // オリジナルのレスポンスヘッダーを転送（許可されたものだけ）
    ALLOWED_HEADERS.forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        res.setHeader(header, value);
      }
    });

    // レスポンスステータスを設定
    res.status(response.status);

    // ボディを直接転送
    const content = await response.text();
    res.send(content);

    logger.info(`プロキシレスポンス成功: ${url}`, {
      status: response.status,
      contentType: response.headers.get('Content-Type')
    });
    return;

  } catch (error) {
    logger.error('プロキシリクエストエラー', {
      url,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : 'Unknown error'
    });
    res.status(500).send('失敗しました');
    return;
  }
};

app.get('/api/fetch-content', proxyHandler);

app.listen(PORT, () => {
  logger.info(`Proxy server running at http://localhost:${PORT}`);
});