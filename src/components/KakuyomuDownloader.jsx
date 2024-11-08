import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  fetchEpisodeWithRetry,
  fetchEpisodeList,
  sleep,
  getWaitTime,
  Constants
} from '../lib/episodeFetcher';
import generateEpub from '../lib/epubGenerator';
import db from '../lib/database';

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
  const [generating, setGenerating] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleFetchEpisodes = async () => {
    if (!url) return;
    setLoading(true);

    try {
      const data = await fetchEpisodeList(url);
      setWorkTitle(data.workTitle);
      setEpisodes(data.episodes.map(ep => ({ ...ep, selected: false })));
      const initialStatus = {};
      data.episodes.forEach(ep => {
        initialStatus[ep.id] = { status: 'pending', error: null };
      });
      setDownloadStatus(initialStatus);
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

  const handleClearCache = async () => {
    if (!url) return;

    if (!confirm('この作品のキャッシュをすべて削除しますか？\nダウンロードの際に再度サーバーからデータを取得する必要があります。')) {
      return;
    }

    setClearing(true);
    try {
      await db.clearWorkCache(url);

      // 状態をリセット
      setEpisodes([]);
      setWorkTitle('');
      setDownloadStatus({});
      setSelectAll(false);

      alert('キャッシュを削除しました。');
    } catch (error) {
      console.error('キャッシュ削除エラー:', error);
      alert('キャッシュの削除に失敗しました。');
    } finally {
      setClearing(false);
    }
  };

  const handleDownload = async () => {
    const selectedEpisodes = episodes.filter(ep => ep.selected);
    if (selectedEpisodes.length === 0) {
      alert('エピソードを選択してください');
      return;
    }

    setDownloading(true);
    const updatedStatus = { ...downloadStatus };
    const downloadedEpisodes = [];
    let lastRequestTime = null;

    try {
      const total = selectedEpisodes.length;
      for (let i = 0; i < selectedEpisodes.length; i++) {
        const episode = selectedEpisodes[i];
        setCurrentProgress(`${i + 1}/${total} 取得中...`);

        updatedStatus[episode.id] = { status: 'downloading', error: null };
        setDownloadStatus({ ...updatedStatus });

        try {
          if (!episode.url) {
            throw new Error('エピソードURLが見つかりません');
          }

          // 前回の実際のリクエストからの待機時間を計算
          const waitTime = getWaitTime(lastRequestTime);
          if (waitTime > 0) {
            await sleep(waitTime);
          }

          const data = await fetchEpisodeWithRetry(episode.url);

          // キャッシュミスの場合のみ、最後のリクエスト時刻を更新
          if (!data.fromCache) {
            lastRequestTime = Date.now();
          }

          console.log('取得成功:', {
            url: episode.url,
            originalTitle: episode.title,
            fetchedTitle: data.title,
            contentLength: data.content.length,
            fromCache: data.fromCache
          });

          updatedStatus[episode.id] = {
            status: 'completed',
            error: null,
          };

          downloadedEpisodes.push({
            ...episode,
            ...data
          });

        } catch (error) {
          console.error(`エピソード取得エラー (${episode.title}):`, error);
          updatedStatus[episode.id] = {
            status: 'error',
            error: `${error.message} (${Constants.RETRY_COUNT}回リトライ後)`
          };
        }

        setDownloadStatus({ ...updatedStatus });
      }

      if (downloadedEpisodes.length === 0) {
        throw new Error('ダウンロードに成功したエピソードがありません');
      }

      setCurrentProgress('EPUB生成中...');
      setGenerating(true);

      const result = await generateEpub(
        workTitle,
        downloadedEpisodes
      );

      if (!result.success) {
        throw new Error(result.error || 'EPUBの生成に失敗しました');
      }

      setCurrentProgress('');
      alert('EPUBの生成が完了しました！');

    } catch (error) {
      console.error('全体エラー:', error);
      alert(error.message || 'EPUBの生成に失敗しました');
    } finally {
      setDownloading(false);
      setGenerating(false);
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
              onClick={handleFetchEpisodes}
              disabled={!url || loading}
            >
              {loading ? '取得中...' : '取得'}
            </Button>
            {workTitle && (
              <Button
                onClick={handleClearCache}
                variant="outline"
                disabled={clearing || downloading || generating}
              >
                {clearing ? 'クリア中...' : 'キャッシュクリア'}
              </Button>
            )}
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
                    onClick={handleDownload}
                    disabled={downloading || generating || !episodes.some(ep => ep.selected)}
                  >
                    {downloading ? '取得中...' : generating ? 'EPUB生成中...' : 'EPUBをダウンロード'}
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
