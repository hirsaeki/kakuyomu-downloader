import React from 'react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

interface LoggerControlsProps {
  className?: string;
}

/**
 * ロガーの操作を提供するコントロールコンポーネント
 * 
 * @remarks
 * - ログのダウンロード
 * - ログのクリア
 * 
 * @param props - コンポーネントのプロパティ
 * @returns ロガーコントロールコンポーネント
 */
export const LoggerControls: React.FC<LoggerControlsProps> = ({
  className
}) => {
  const handleDownloadLogs = async () => {
    await logger.downloadLogs();
  };

  const handleClearLogs = () => {
    logger.clearLogs();
  };

  return (
    <div className={`mt-4 space-x-4 ${className || ''}`}>
      <Button
        onClick={handleDownloadLogs}
        variant="default"
        className="space-x-2"
      >
        Download Logs
      </Button>
      <Button
        onClick={handleClearLogs}
        variant="outline"
        className="space-x-2"
      >
        Clear Logs
      </Button>
    </div>
  );
};
