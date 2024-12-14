import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';

interface SelectionControlsProps {
  selectAll: boolean;
  showGroupTitles: boolean;
  isDisabled?: boolean;
  onSelectAll: (checked: boolean) => void;
  onToggleGroupTitles: (checked: boolean) => void;
}

/**
 * エピソード選択に関する操作を提供するコントロールコンポーネント
 * 
 * @remarks
 * - 全選択/解除の切り替え
 * - グループ名表示/非表示の切り替え
 * 
 * @param props - コンポーネントのプロパティ
 * @returns 選択コントロールコンポーネント
 */
export const SelectionControls: React.FC<SelectionControlsProps> = ({
  selectAll,
  showGroupTitles,
  isDisabled = false,
  onSelectAll,
  onToggleGroupTitles
}) => {
  // アクセシビリティのためのaria-label
  const selectAllLabel = selectAll ? "すべての選択を解除" : "すべて選択";
  const groupTitlesLabel = showGroupTitles ? "グループ名を非表示" : "グループ名を表示";

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="selectAll"
          checked={selectAll}
          onCheckedChange={onSelectAll}
          disabled={isDisabled}
          aria-label={selectAllLabel}
        />
        <label 
          htmlFor="selectAll"
          className={`${isDisabled ? 'text-muted-foreground cursor-not-allowed' : 'cursor-pointer'} text-sm`}
        >
          全選択/解除
        </label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="showGroupTitles"
          checked={showGroupTitles}
          onCheckedChange={onToggleGroupTitles}
          disabled={isDisabled}
          aria-label={groupTitlesLabel}
        />
        <label 
          htmlFor="showGroupTitles"
          className={`${isDisabled ? 'text-muted-foreground cursor-not-allowed' : 'cursor-pointer'} text-sm`}
        >
          グループ名を表示
        </label>
      </div>
    </div>
  );
};
