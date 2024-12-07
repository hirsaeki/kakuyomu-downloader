import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, XCircle } from 'lucide-react';

interface DownloadControlsProps {
  isDownloading: boolean;
  isGenerating: boolean;
  hasSelectedEpisodes: boolean;
  progress?: string;
  onDownload: () => void;
  onCancel?: () => void;
}

export const DownloadControls: React.FC<DownloadControlsProps> = ({
  isDownloading,
  isGenerating,
  hasSelectedEpisodes,
  progress,
  onDownload,
  onCancel
}) => {
  // 操作の無効化条件...ふん、こんな基本的なことは説明しなくても分かるでしょ？
  const isDisabled = isDownloading || isGenerating || !hasSelectedEpisodes;

  return (
    <div className="flex items-center space-x-4">
      {progress && (
        <span className="text-sm text-muted-foreground">
          {progress}
        </span>
      )}
      {isDownloading && onCancel ? (
        <Button
          onClick={onCancel}
          variant="destructive"
          className="space-x-2"
          type="button"
        >
          <XCircle className="h-4 w-4" />
          <span>キャンセル</span>
        </Button>
      ) : (
        <Button
          onClick={onDownload}
          disabled={isDisabled}
          className="space-x-2"
          type="button"
        >
          {(isDownloading || isGenerating) && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          <span>
            {isDownloading ? 'ダウンロード中...' : 
             isGenerating ? 'EPUB生成中...' : 
             'EPUBをダウンロード'}
          </span>
        </Button>
      )}
    </div>
  );
};
