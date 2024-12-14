import React from 'react';

interface WorkInfoProps {
  title: string;
  author: string;
  adapterName?: string;
}

/**
 * 作品情報を表示するコンポーネント
 * 
 * @remarks
 * - 作品タイトル
 * - 作者名
 * - 選択中のサイト名（オプション）
 */
export const WorkInfo: React.FC<WorkInfoProps> = ({
  title,
  author,
  adapterName
}) => (
  <div className="space-y-2">
    <div className="text-lg font-medium">
      作品タイトル: {title}
    </div>
    <div className="text-sm text-muted-foreground">
      作者: {author}
    </div>
    {adapterName && (
      <div className="text-sm text-muted-foreground">
        選択中のサイト: {adapterName}
      </div>
    )}
  </div>
);
