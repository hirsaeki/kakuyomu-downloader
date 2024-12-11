import express from 'express';
import cors from 'cors';
import { fetchNovelContent } from './controllers/novel-controller';
import { createContextLogger } from './logger';
import { errorHandler } from './middleware/error-handler';

const serverLogger = createContextLogger('Server');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// コンテンツ取得のエンドポイント
app.get('/api/fetch-content', fetchNovelContent);

// エラーハンドラーは全てのルーティングの後に配置
app.use(errorHandler);

app.listen(PORT, () => {
  serverLogger.info(`Server running at http://localhost:${PORT}`);
});