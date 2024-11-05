import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

// エピソード一覧の取得
app.get('/api/fetch-episodes', async (req, res) => {
  try {
    const { url } = req.query;
    const response = await fetch(url);
    const html = await response.text();
    
    const dom = new JSDOM(html);
    const document = dom.window.document;

    let episodeMap = new Map(); // URLをキーとしてエピソードを管理

    // 作品タイトルを探す（Headingクラスを持つ要素を検索）
    const workTitleElement = Array.from(document.getElementsByTagName('*'))
      .find(el => Array.from(el.classList)
        .some(className => className.startsWith('Heading_heading')));
    
    const workTitle = workTitleElement ? 
      workTitleElement.textContent.trim() : 
      'Unknown Work Title';

    // グループコンテナを検出
    const episodeGroups = Array.from(document.getElementsByTagName('div'))
      .filter(el => Array.from(el.classList)
        .some(className => className.startsWith('NewBox_padding')));

    // 有効なグループ（エピソードを含むグループ）のみを処理
    const validGroups = episodeGroups.filter(group => {
      const episodeLinks = Array.from(group.getElementsByTagName('a'))
        .filter(el => Array.from(el.classList)
          .some(className => className.startsWith('WorkTocSection_link')));
      return episodeLinks.length > 0;
    });

    // 各グループを処理
    validGroups.forEach(group => {
      const groupTitleElement = group.querySelector('h3');
      const groupTitle = groupTitleElement ? groupTitleElement.textContent.trim() : '';

      // グループ内のエピソードリンクを探す
      const episodeLinks = Array.from(group.getElementsByTagName('a'))
        .filter(el => Array.from(el.classList)
          .some(className => className.startsWith('WorkTocSection_link')));

      episodeLinks.forEach(node => {
        const titleElement = Array.from(node.getElementsByTagName('*'))
          .find(el => Array.from(el.classList)
            .some(className => className.startsWith('WorkTocSection_title')));

        const dateElement = node.querySelector('time');
        const href = node.getAttribute('href');
        const episodeUrl = `https://kakuyomu.jp${href}`;

        // URLが存在しないか、既存のエピソードにグループタイトルがない場合のみ追加/更新
        const existingEpisode = episodeMap.get(episodeUrl);
        if (!existingEpisode || (existingEpisode && !existingEpisode.groupTitle && groupTitle)) {
          episodeMap.set(episodeUrl, {
            id: href.split('/').pop(),
            title: titleElement ? titleElement.textContent.trim() : 'Unknown Title',
            groupTitle: groupTitle,
            url: episodeUrl,
            date: dateElement ? dateElement.getAttribute('datetime') : '',
          });
        }
      });
    });

    const episodes = Array.from(episodeMap.values());

    if (episodes.length === 0) {
      throw new Error('エピソードが見つかりませんでした。URLを確認してください。');
    }

    res.json({ success: true, episodes, workTitle });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
    });
  }
});

// エピソード本文の取得
app.get('/api/fetch-content', async (req, res) => {
  try {
    const { url } = req.query;
    const response = await fetch(url);
    const html = await response.text();
    
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // 要件に合わせてクラス名を変更
    const titleElement = document.querySelector('.widget-episodeTitle');
    const contentElement = document.querySelector('.widget-episodeBody');
    
    if (!contentElement) {
      throw new Error('本文が見つかりませんでした。');
    }

    // タイトルと本文の両方を返す
    res.json({ 
      success: true, 
      title: titleElement ? titleElement.textContent.trim() : '',
      content: contentElement.innerHTML 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
