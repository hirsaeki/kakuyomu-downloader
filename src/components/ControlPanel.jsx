import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

const ControlPanel = ({
  selectAll,
  showGroupTitles,
  currentProgress,
  downloading,
  generating,
  onSelectAll,
  onToggleGroupTitles,
  onDownload,
  hasSelectedEpisodes
}) => {
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="selectAll"
            checked={selectAll}
            onCheckedChange={onSelectAll}
          />
          <label htmlFor="selectAll">全選択/解除</label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="showGroupTitles"
            checked={showGroupTitles}
            onCheckedChange={onToggleGroupTitles}
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
          onClick={onDownload}
          disabled={downloading || generating || !hasSelectedEpisodes}
        >
          {downloading ? '取得中...' : generating ? 'EPUB生成中...' : 'EPUBをダウンロード'}
        </Button>
      </div>
    </div>
  );
};

export default ControlPanel;
