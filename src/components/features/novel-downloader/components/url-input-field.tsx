import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface URLInputFieldProps {
  url: string;
  onUrlChange: (url: string) => void;
  onFetch: () => void;
  onClearCache: () => void;
  isLoading: boolean;
  isDisabled: boolean;
  isClearing: boolean;
  hasWorkTitle: boolean;
  currentAdapter: boolean;
}

/**
 * URL入力フィールドとアクションボタンのコンポーネント
 * 
 * @remarks
 * - URL入力
 * - エピソード取得
 * - キャッシュクリア
 */
export const URLInputField: React.FC<URLInputFieldProps> = ({
  url,
  onUrlChange,
  onFetch,
  onClearCache,
  isLoading,
  isDisabled,
  isClearing,
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
      {hasWorkTitle && (
        <Button
          onClick={onClearCache}
          variant="outline"
          disabled={isClearing || isDisabled}
        >
          {isClearing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              クリア中...
            </>
          ) : 'キャッシュクリア'}
        </Button>
      )}
    </div>
  );
};
