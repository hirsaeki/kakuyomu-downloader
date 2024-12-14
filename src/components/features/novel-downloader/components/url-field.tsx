import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface URLFieldProps {
  url: string;
  onUrlChange: (url: string) => void;
  onFetch: () => void;
  loading: boolean;
  error?: string;
  disabled?: boolean;
  currentSite?: string;
  supportedSites: string[];
}

export const URLField: React.FC<URLFieldProps> = ({
  url,
  onUrlChange,
  onFetch,
  loading,
  error,
  disabled = false,
  currentSite,
  supportedSites,
}) => {
  const showSitesWarning = url && !currentSite;

  return (
    <div className="space-y-2">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {showSitesWarning && (
        <Alert 
          variant="default"
          className="border-orange-200 bg-orange-100 dark:border-orange-900 dark:bg-orange-900/20"
        >
          <AlertDescription>
            対応サイト: {supportedSites.join(', ')}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex space-x-2">
        <Input
          type="url"
          placeholder="作品ページのURLを入力"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          className="flex-1"
          disabled={disabled || loading}
        />
        <Button
          onClick={onFetch}
          disabled={!url || !currentSite || loading || disabled}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              取得中...
            </>
          ) : '取得'}
        </Button>
      </div>

      {currentSite && (
        <div className="text-sm">
          選択中のサイト: {currentSite}
        </div>
      )}
    </div>
  );
};