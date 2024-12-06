import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchNovelContent } from './controllers/novelController';
import { createContextLogger } from './logger';

const serverLogger = createContextLogger('Server');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

// コンテンツ取得のエンドポイント
app.get('/api/fetch-content', fetchNovelContent);

app.listen(PORT, () => {
  serverLogger.info(`Server running at http://localhost:${PORT}`);
});
