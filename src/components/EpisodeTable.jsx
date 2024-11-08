import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';

const EpisodeTable = ({ 
  episodes, 
  downloadStatus, 
  showGroupTitles, 
  onSelectEpisode 
}) => {
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

  return (
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
                  onCheckedChange={(checked) => onSelectEpisode(index, checked)}
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
  );
};

export default EpisodeTable;
