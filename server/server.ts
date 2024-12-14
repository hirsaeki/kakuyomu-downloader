import express from 'express';
import type { RequestHandler } from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { logger } from './logger';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());

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
    const content = await response.text();
    logger.info(`プロキシレスポンス成功: ${url}`);
    
    // レスポンスを適切な形式に変換
    res.json({
      success: true,
      data: {
        content,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
          url: response.url
      }
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