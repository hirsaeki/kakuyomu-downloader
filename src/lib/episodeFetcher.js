import db from './database';

const RETRY_COUNT = 3;
const RETRY_DELAY = 2000;
const REQUEST_INTERVAL = 1000;

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchEpisodeWithRetry = async (episodeUrl, retryCount = RETRY_COUNT) => {
  if (!episodeUrl) {
    throw new Error('エピソードURLが指定されていません');
  }

  // まずキャッシュを確認
  const cachedContent = await db.getContent(episodeUrl);
  if (cachedContent) {
    console.log('キャッシュからコンテンツを取得:', episodeUrl);
    return {
      ...cachedContent,
      fromCache: true  // キャッシュフラグを追加
    };
  }

  // キャッシュになければ取得を試行
  for (let i = 0; i < retryCount; i++) {
    try {
      const response = await fetch(`/api/fetch-content?url=${encodeURIComponent(episodeUrl)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'コンテンツの取得に失敗しました');
      }

      if (i > 0) {
        console.log(`リトライ成功 (${i + 1}回目): ${episodeUrl}`);
      }

      // 成功したらキャッシュに保存
      await db.saveContent(episodeUrl, data.title, data.content);

      return {
        ...data,
        fromCache: false  // 新規取得フラグを追加
      };
    } catch (error) {
      console.error(`試行 ${i + 1}/${retryCount} 失敗:`, error);

      if (i === retryCount - 1) {
        throw error;
      }

      await sleep(RETRY_DELAY);
    }
  }
};

export const fetchEpisodeList = async (url) => {
  if (!url) {
    throw new Error('URLが指定されていません');
  }

  // まずキャッシュを確認
  const cachedWork = await db.getWork(url);
  if (cachedWork) {
    const cachedEpisodes = await db.getEpisodes(url);
    if (cachedEpisodes && cachedEpisodes.length > 0) {
      console.log('キャッシュから作品情報を取得:', url);
      return {
        success: true,
        workTitle: cachedWork.workTitle,
        episodes: cachedEpisodes
      };
    }
  }

  try {
    const response = await fetch(`/api/fetch-episodes?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'エピソード一覧の取得に失敗しました');
    }

    // 成功したらキャッシュに保存
    await db.saveWork(url, data.workTitle);
    await db.saveEpisodes(url, data.episodes);

    return data;
  } catch (error) {
    console.error('エピソード一覧取得エラー:', error);
    throw error;
  }
};

// スマートな流量制限のためのヘルパー関数
export const shouldWaitForNextRequest = (lastRequestTime, fromCache) => {
  if (fromCache) {
    return false;  // キャッシュヒットの場合は待機不要
  }

  if (!lastRequestTime) {
    return false;  // 最初のリクエストは待機不要
  }

  // 前回の実際のリクエストからの経過時間をチェック
  const elapsed = Date.now() - lastRequestTime;
  return elapsed < REQUEST_INTERVAL;
};

// 最後のリクエスト時刻を取得
export const getWaitTime = (lastRequestTime) => {
  if (!lastRequestTime) {
    return 0;
  }

  const elapsed = Date.now() - lastRequestTime;
  const waitTime = Math.max(0, REQUEST_INTERVAL - elapsed);
  return waitTime;
};

export const Constants = {
  RETRY_COUNT,
  RETRY_DELAY,
  REQUEST_INTERVAL
};
