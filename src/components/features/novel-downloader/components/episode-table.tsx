import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { getDisplayTitle } from '@/lib/display/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type Episode, type EpisodeStatus } from '@/types/common';

// ステータスインジケーターコンポーネント
const StatusIndicator: React.FC<{ status?: EpisodeStatus }> = ({ status }) => {
  if (!status) return <span aria-label="未取得">－</span>;

  switch (status.status) {
    case 'downloading':
      return <span aria-label="取得中">⏳ 取得中</span>;
    case 'completed':
      return <span aria-label="完了">✅ 完了</span>;
    case 'error':
      return (
        <div>
          <span aria-label="エラー">❌ エラー</span>
          {status.error && (
            <div className="text-xs text-red-500" title={status.error}>
              {status.error}
            </div>
          )}
        </div>
      );
    default:
      return <span aria-label="未取得">－</span>;
  }
};

// テーブルヘッダーコンポーネント
const TableColumns = () => (
  <TableHeader>
    <TableRow>
      <TableHead className="w-16">選択</TableHead>
      <TableHead>タイトル</TableHead>
      <TableHead className="w-32">公開日</TableHead>
      <TableHead className="w-32 text-center">状態</TableHead>
    </TableRow>
  </TableHeader>
);

export interface EpisodeTableProps {
  episodes: Episode[];
  downloadStatus: Record<string, EpisodeStatus>;
  showGroupTitles: boolean;
  onSelectEpisode: (url: string, selected: boolean) => void;
  className?: string;
}

export const EpisodeTable: React.FC<EpisodeTableProps> = ({
  episodes,
  downloadStatus,
  showGroupTitles,
  onSelectEpisode,
  className
}) => {
  if (episodes.length === 0) return null;

  return (
    <div className={className}>
      <Table>
        <TableColumns />
        <TableBody>
          {episodes.map((episode) => {
            const status = downloadStatus[episode.url];
            const isDownloading = status?.status === 'downloading';

            return (
              <TableRow key={episode.url}>
                <TableCell className="text-center">
                  <Checkbox
                    id={`episode-${episode.url}`}
                    checked={episode.selected}
                    onCheckedChange={(checked) => 
                      onSelectEpisode(episode.url, checked as boolean)
                    }
                    disabled={isDownloading}
                    aria-label={`${episode.title}を選択`}
                  />
                </TableCell>
                <TableCell>
                  <label
                    htmlFor={`episode-${episode.url}`}
                    className="block cursor-pointer hover:text-primary"
                  >
                    {getDisplayTitle(episode, showGroupTitles)}
                  </label>
                </TableCell>
                <TableCell>
                  {episode.date ? new Date(episode.date).toLocaleDateString('ja-JP') : ''}
                </TableCell>
                <TableCell className="text-center">
                  <StatusIndicator status={status} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};