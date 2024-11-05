import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const KakuyomuDownloader = () => {
  const [url, setUrl] = useState('');
  const [episodes, setEpisodes] = useState([]);
  const [workTitle, setWorkTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [showGroupTitles, setShowGroupTitles] = useState(true);

  const fetchEpisodes = async () => {
    if (!url) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/fetch-episodes?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      
      if (data.success) {
        setWorkTitle(data.workTitle);
        setEpisodes(data.episodes.map(ep => ({ ...ep, selected: false })));
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

  const downloadEpub = async () => {
    const selectedEpisodes = episodes.filter(ep => ep.selected);
    if (selectedEpisodes.length === 0) {
      alert('エピソードを選択してください');
      return;
    }

    setDownloading(true);

    try {
      // エピソード本文の取得
      const episodesWithContent = await Promise.all(
        selectedEpisodes.map(async episode => {
          const response = await fetch(
            `/api/fetch-content?url=${encodeURIComponent(episode.url)}`
          );
          const data = await response.json();
          return {
            ...episode,
            content: data.success ? data.content : ''
          };
        })
      );

      // EPUBの生成をサーバーに依頼
      const response = await fetch('/api/generate-epub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: workTitle,
          episodes: episodesWithContent
        })
      });

      if (!response.ok) {
        throw new Error('EPUB generation failed');
      }

      // EPUBファイルのダウンロード
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // ファイル名に作品タイトルを使用
      a.download = `${workTitle}.epub`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error:', error);
      alert('EPUBの生成に失敗しました');
    } finally {
      setDownloading(false);
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
                <Button
                  onClick={downloadEpub}
                  disabled={downloading || !episodes.some(ep => ep.selected)}
                >
                  {downloading ? '生成中...' : 'EPUBをダウンロード'}
                </Button>
              </div>

              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2">選択</th>
                      <th className="p-2 text-left">タイトル</th>
                      <th className="p-2 text-left">公開日</th>
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
