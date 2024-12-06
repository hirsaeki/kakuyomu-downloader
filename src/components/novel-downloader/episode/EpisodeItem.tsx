import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusIndicator } from './StatusIndicator';
import { getDisplayTitle } from '@/lib/display/utils';
import type { Episode, EpisodeStatus } from '@/types';

interface EpisodeItemProps {
  episode: Episode;
  status: EpisodeStatus;
  showGroupTitle: boolean;
  onSelect: (checked: boolean) => void;
}

export const EpisodeItem: React.FC<EpisodeItemProps> = ({
  episode,
  status,
  showGroupTitle,
  onSelect
}) => (
  <tr className="border-b">
    <td className="p-2 text-center">
      <Checkbox
        id={`episode-${episode.id}`}
        checked={episode.selected}
        onCheckedChange={onSelect}
        disabled={status?.status === 'downloading'}
      />
    </td>
    <td className="p-2">
      <label 
        htmlFor={`episode-${episode.id}`}
        className="block cursor-pointer"
      >
        {getDisplayTitle(episode, showGroupTitle)}
      </label>
    </td>
    <td className="p-2">
      {episode.date ? new Date(episode.date).toLocaleDateString('ja-JP') : ''}
    </td>
    <td className="p-2 text-center">
      <StatusIndicator status={status} />
    </td>
  </tr>
);
