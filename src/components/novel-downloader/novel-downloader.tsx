import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { ErrorAlert, ProgressAlert, WarningAlert, ClearCacheDialog } from './alerts';
import { DownloadControls, SelectionControls } from './controls';
import { EpisodeList } from './episode';
import { useNovelDownloader } from '@/hooks/novel-downloader';
import { setupAdapters } from '@/adapters';
import { BaseNovelSiteAdapter } from '@/adapters';

export const NovelDownloader: React.FC = () => {
  // アプリケーション起動時にファクトリーを初期化
  const factory = setupAdapters();
  
  const {
    url,
    setUrl,
    workTitle,
    author,
    episodes,
    loading,
    error,
    currentAdapter,
    downloadStatus,
    currentProgress,
    selectAll,
    showGroupTitles,
    showClearDialog,
    isDownloading,
    isGenerating,
    isClearing,
    handleFetchEpisodes,
    handleSelectAll,
    handleSelectEpisode,
    handleDownload,
    handleClearCache,
    setShowGroupTitles,
    setShowClearDialog,
    cancelDownload,
  } = useNovelDownloader(factory);

  // 登録済みのアダプター一覧を取得
  const adapters = factory.getRegisteredAdapters();

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Web小説 Novel Downloader</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {error && <ErrorAlert message={error} />}
          {url && !currentAdapter && (
            <WarningAlert 
              message={`対応サイト: ${adapters.map((a: BaseNovelSiteAdapter) => a.siteName).join(', ')}`} 
            />
          )}
          {(loading || isDownloading || isGenerating || isClearing) && 
            currentProgress && <ProgressAlert message={currentProgress} />
          }

          <div className="flex space-x-2">
            <Input
              type="url"
              placeholder="作品ページのURLを入力"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
              disabled={isDownloading || isGenerating || isClearing}
            />
            <Button
              onClick={handleFetchEpisodes}
              disabled={!url || !currentAdapter || loading || isDownloading || 
                       isGenerating || isClearing}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  取得中...
                </>
              ) : '取得'}
            </Button>
            {workTitle && (
              <Button
                onClick={() => setShowClearDialog(true)}
                variant="outline"
                disabled={isClearing || isDownloading || isGenerating}
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

          {currentAdapter && (
            <div className="text-sm">
              選択中のサイト: {currentAdapter.siteName}
            </div>
          )}

          {episodes.length > 0 && (
            <>
              {workTitle && (
                <div className="space-y-2">
                  <div className="text-lg font-medium">
                    作品タイトル: {workTitle}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    作者: {author}
                  </div>
                </div>
              )}
              
              <div className="flex justify-between">
                <SelectionControls
                  selectAll={selectAll}
                  showGroupTitles={showGroupTitles}
                  isDisabled={isDownloading || isGenerating}
                  onSelectAll={handleSelectAll}
                  onToggleGroupTitles={setShowGroupTitles}
                />
                <DownloadControls
                  isDownloading={isDownloading}
                  isGenerating={isGenerating}
                  hasSelectedEpisodes={episodes.some(ep => ep.selected)}
                  progress={currentProgress}
                  onDownload={handleDownload}
                  onCancel={isDownloading ? cancelDownload : undefined}
                />
              </div>

              <EpisodeList
                episodes={episodes}
                downloadStatus={downloadStatus}
                showGroupTitles={showGroupTitles}
                onSelectEpisode={handleSelectEpisode}
              />
            </>
          )}
        </div>

        <ClearCacheDialog
          isOpen={showClearDialog}
          onConfirm={handleClearCache}
          onCancel={() => setShowClearDialog(false)}
        />
      </CardContent>
    </Card>
  );
};