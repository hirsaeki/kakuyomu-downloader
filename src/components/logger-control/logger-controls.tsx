import React from 'react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

export const LoggerControls: React.FC = () => {
  const handleDownloadLogs = async () => {
    await logger.downloadLogs();
  };

  const handleClearLogs = () => {
    logger.clearLogs();
  };

  return (
    <div className="mt-4 space-x-4">
      <Button onClick={handleDownloadLogs} variant="default">
        Download Logs
      </Button>
      <Button onClick={handleClearLogs} variant="outline">
        Clear Logs
      </Button>
    </div>
  );
};

export default LoggerControls;