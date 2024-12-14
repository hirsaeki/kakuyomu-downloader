import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface URLInputFieldProps {
  url: string;
  onUrlChange: (url: string) => void;
  onFetch: () => void;
  isLoading: boolean;
  isDisabled: boolean;
  hasWorkTitle: boolean;
  currentAdapter: boolean;
}

/**
 * URL入力フィールドとアクションボタンのコンポーネント
 * 
 * @remarks
 * - URL入力
 * - エピソード取得
 */
export const URLInputField: React.FC<URLInputFieldProps> = ({
  url,
  onUrlChange,
  onFetch,
  isLoading,
  isDisabled,
  hasWorkTitle,
  currentAdapter
}) => {
  return (
    <div className="flex space-x-2">
      <Input
        type="url"
        placeholder="作品ページのURLを入力"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        className="flex-1"
        disabled={isDisabled}
      />
      <Button
        onClick={onFetch}
        disabled={!url || !currentAdapter || isDisabled || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            取得中...
          </>
        ) : '取得'}
      </Button>
    </div>
  );
};