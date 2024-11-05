import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const RETRY_COUNT = 3;
const RETRY_DELAY = 2000;
const REQUEST_INTERVAL = 1000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchEpisodeWithRetry = async (url, retryCount = RETRY_COUNT) => {
  for (let i = 0; i < retryCount; i++) {
    try {
      const response = await fetch(`/api/fetch-content?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (data.success) {
        if (i > 0) {
          console.log(`リトライ成功 (${i + 1}回目): ${url}`);
        }
        return data;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error(`試行 ${i + 1}/${retryCount} 失敗:`, error);

      if (i === retryCount - 1) {
        throw error;
      }

      await sleep(RETRY_DELAY);
    }
  }
};

const KakuyomuDownloader = () => {
  const [url, setUrl] = useState('');
  const [episodes, setEpisodes] = useState([]);
  const [workTitle, setWorkTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [showGroupTitles, setShowGroupTitles] = useState(true);
  const [downloadStatus, setDownloadStatus] = useState({});
  const [currentProgress, setCurrentProgress] = useState('');

  const fetchEpisodes = async () => {
    if (!url) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/fetch-episodes?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (data.success) {
        console.log('取得した作品情報:', data);
        setWorkTitle(data.workTitle);
        setEpisodes(data.episodes.map(ep => ({ ...ep, selected: false })));
        const initialStatus = {};
        data.episodes.forEach(ep => {
          initialStatus[ep.id] = { status: 'pending', error: null };
        });
        setDownloadStatus(initialStatus);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('エピソード一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    setEpisodes(episodes.map(ep => ({ ...ep, selected: checked })));
  };

  const handleSelectEpisode = (index, checked) => {
    const updatedEpisodes = episodes.map((ep, i) =>
      i === index ? { ...ep, selected: checked } : ep
    );
    setEpisodes(updatedEpisodes);
    setSelectAll(updatedEpisodes.every(ep => ep.selected));
  };

  const getDisplayTitle = (episode) => {
    if (showGroupTitles && episode.groupTitle) {
      return `${episode.groupTitle} - ${episode.title}`;
    }
    return episode.title;
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'downloading':
        return '⏳ 取得中';
      case 'completed':
        return '✅ 完了';
      case 'error':
        return '❌ エラー';
      default:
        return '－';
    }
  };

  const downloadEpub = async () => {
    const selectedEpisodes = episodes.filter(ep => ep.selected);
    if (selectedEpisodes.length === 0) {
      alert('エピソードを選択してください');
      return;
    }

    setDownloading(true);
    console.log('選択されたエピソード:', selectedEpisodes);

    // ローカルで状態を管理
    const updatedStatus = { ...downloadStatus };
    const downloadedEpisodes = [];

    try {
      const total = selectedEpisodes.length;
      for (let i = 0; i < selectedEpisodes.length; i++) {
        const episode = selectedEpisodes[i];
        setCurrentProgress(`${i + 1}/${total} 取得中...`);

        console.log(`\n--- エピソード取得開始 (${i + 1}/${total}): ${episode.title} ---`);

        // UI更新用の一時的なステータス
        updatedStatus[episode.id] = { status: 'downloading', error: null };
        setDownloadStatus({ ...updatedStatus });

        try {
          const data = await fetchEpisodeWithRetry(episode.url);

          console.log('取得成功:', {
            url: episode.url,
            originalTitle: episode.title,
            fetchedTitle: data.title,
            contentLength: data.content.length,
            content: data.content.substring(0, 200) + '...'
          });

          // ローカルステータス更新
          updatedStatus[episode.id] = {
            status: 'completed',
            error: null,
            title: data.title,
            content: data.content
          };
          downloadedEpisodes.push({
            ...episode,
            ...data
          });

        } catch (error) {
          console.error(`エピソード取得エラー (${episode.title}):`, error);
          updatedStatus[episode.id] = {
            status: 'error',
            error: `${error.message} (${RETRY_COUNT}回リトライ後)`
          };
        }

        // UI更新
        setDownloadStatus({ ...updatedStatus });

        if (i < selectedEpisodes.length - 1) {
          await sleep(REQUEST_INTERVAL);
        }
      }

      setCurrentProgress('');

      // 最終結果のログ出力
      console.log('\n=== 取得結果サマリー ===');
      console.log('ダウンロード状態:', updatedStatus);
      const completedCount = Object.values(updatedStatus).filter(s => s.status === 'completed').length;
      console.log('取得したエピソード数:', completedCount);
      const failedEpisodes = Object.entries(updatedStatus)
        .filter(([_, s]) => s.status === 'error')
        .map(([id, s]) => ({
          id,
          error: s.error
        }));
      console.log('エラーのあったエピソード:', failedEpisodes);
      console.log('取得した本文データ:', downloadedEpisodes);

      if (failedEpisodes.length > 0) {
        throw new Error('一部のエピソードの取得に失敗しました');
      }

    } catch (error) {
      console.error('全体エラー:', error);
      alert(error.message || 'EPUBの生成に失敗しました');
    } finally {
      setDownloading(false);
      setCurrentProgress('');
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>カクヨム Novel Downloader</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Input
              type="url"
              placeholder="作品ページのURLを入力"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={fetchEpisodes}
              disabled={!url || loading}
            >
              {loading ? '取得中...' : '取得'}
            </Button>
          </div>

          {episodes.length > 0 && (
            <>
              {workTitle && (
                <div className="text-lg font-medium">
                  作品タイトル: {workTitle}
                </div>
              )}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="selectAll"
                      checked={selectAll}
                      onCheckedChange={handleSelectAll}
                    />
                    <label htmlFor="selectAll">全選択/解除</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="showGroupTitles"
                      checked={showGroupTitles}
                      onCheckedChange={setShowGroupTitles}
                    />
                    <label htmlFor="showGroupTitles">グループ名を表示</label>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {currentProgress && (
                    <span className="text-sm text-muted-foreground">
                      {currentProgress}
                    </span>
                  )}
                  <Button
                    onClick={downloadEpub}
                    disabled={downloading || !episodes.some(ep => ep.selected)}
                  >
                    {downloading ? '取得中...' : 'EPUBをダウンロード'}
                  </Button>
                </div>
              </div>

              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2">選択</th>
                      <th className="p-2 text-left">タイトル</th>
                      <th className="p-2 text-left">公開日</th>
                      <th className="p-2 text-center">取得状態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {episodes.map((episode, index) => (
                      <tr key={episode.id} className="border-b">
                        <td className="p-2 text-center">
                          <Checkbox
                            checked={episode.selected}
                            onCheckedChange={(checked) => handleSelectEpisode(index, checked)}
                          />
                        </td>
                        <td className="p-2">{getDisplayTitle(episode)}</td>
                        <td className="p-2">
                          {new Date(episode.date).toLocaleDateString('ja-JP')}
                        </td>
                        <td className="p-2 text-center">
                          {getStatusDisplay(downloadStatus[episode.id]?.status)}
                          {downloadStatus[episode.id]?.error && (
                            <div className="text-xs text-red-500">
                              {downloadStatus[episode.id].error}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default KakuyomuDownloader;
