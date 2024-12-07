import React from 'react';
import { EpisodeItem } from './EpisodeItem';
import type { Episode, EpisodeStatus } from '@/types';

interface EpisodeListProps {
  episodes: Episode[];
  downloadStatus: Record<string, EpisodeStatus>;
  showGroupTitles: boolean;
  onSelectEpisode: (index: number, checked: boolean) => void;
}

export const EpisodeList: React.FC<EpisodeListProps> = ({ 
  episodes,
  downloadStatus,
  showGroupTitles,
  onSelectEpisode
}) => {
  if (episodes.length === 0) return null;

  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-2 w-16">選択</th>
            <th className="p-2 text-left">タイトル</th>
            <th className="p-2 text-left w-32">公開日</th>
            <th className="p-2 text-center w-32">状態</th>
          </tr>
        </thead>
        <tbody>
          {episodes.map((episode, index) => (
            <EpisodeItem
              key={episode.id}
              episode={episode}
              status={downloadStatus[episode.id]}
              showGroupTitle={showGroupTitles}
              onSelect={(checked) => onSelectEpisode(index, checked)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
