import React from 'react';
import type { EpisodeStatus } from '@/types';

interface StatusIndicatorProps {
  status?: EpisodeStatus;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  if (!status) return <span>－</span>;

  const getStatusDisplay = () => {
    switch (status.status) {
      case 'downloading':
        return <span>⏳ 取得中</span>;
      case 'completed':
        return <span>✅ 完了</span>;
      case 'error':
        return (
          <div>
            <span>❌ エラー</span>
            {status.error && (
              <div className="text-xs text-red-500" title={status.error}>
                {status.error}
              </div>
            )}
          </div>
        );
      default:
        return <span>－</span>;
    }
  };

  return getStatusDisplay();
};
