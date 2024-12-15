import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BaseNovelSiteAdapter } from '@/adapters';
import { useNovelDownloader } from '@/features/novel-downloader/hooks/use-novel-downloader';
import { useAdapterContext } from '@/features/novel-downloader/hooks/use-adapter-context';
import { ErrorAlert, ProgressAlert } from './alerts';
import { DownloadControls, SelectionControls, ClearCacheDialog } from './controls';
import { EpisodeTable } from './episode-table';
import { URLInputField } from './url-input-field';
import { WorkInfo } from './work-info';
import { Info, HelpCircle } from 'lucide-react';

/**
 * Web小説ダウンローダーのメインコンポーネント
 * 
 * @remarks
 * このコンポーネントは以下の機能を提供します：
 * - URLからの小説情報の取得
 * - エピソードの選択と管理
 * - EPUBファイルのダウンロード
 * - キャッシュの管理
 */
export const NovelDownloader: React.FC = () => {
  // アダプターコンテキストを取得
  const factory = useAdapterContext();

  // メインのカスタムフックを使用
  const { state, actions } = useNovelDownloader(factory);

  // 登録済みのアダプター一覧を取得
  const adapters = factory.getRegisteredAdapters();

  // 全体的な操作の無効化状態
  const isOperationDisabled = 
    state.downloadStatus.isDownloading || 
    state.downloadStatus.isGenerating || 
    state.loading;

  // 選択中のエピソードの有無
  const hasSelectedEpisodes = state.episodes.some(ep => ep.selected);

  // 対応サイトの一覧を生成
  const supportedSites = adapters.map((a: BaseNovelSiteAdapter) => a.siteName).join('、');

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Web小説 Novel Downloader</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* アラート表示エリア */}
          {state.error && (
            <ErrorAlert message={state.error} />
          )}
          {state.downloadStatus.message && (
            <ProgressAlert message={state.downloadStatus.message} />
          )}

          {/* URL入力エリアと作品情報 */}
          <div className="space-y-2">
            <URLInputField
              url={state.url}
              onUrlChange={actions.setUrl}
              onFetch={actions.fetchEpisodes}
              isLoading={state.loading}
              isDisabled={isOperationDisabled}
              currentAdapter={!!state.currentAdapter}
            />
            
            {/* URLの対応状況表示 */}
            {state.url && (
              <div className="flex items-center text-sm text-muted-foreground">
                {state.currentAdapter ? (
                  <>
                    <Info className="h-4 w-4 mr-2 text-blue-500" />
                    {!state.metadata.workTitle ? (
                      <span>{state.currentAdapter.siteName}の作品URLを検出しました。「取得」ボタンをクリックして作品情報を取得できます。</span>
                    ) : null}
                  </>
                ) : (
                  <>
                    <HelpCircle className="h-4 w-4 mr-2 text-orange-500" />
                    <span>現在は{supportedSites}に対応しています。対応サイトの作品URLを入力してください。</span>
                  </>
                )}
              </div>
            )}

            {/* 作品情報とキャッシュクリア */}
            {state.currentAdapter && state.metadata.workTitle && (
              <div className="flex justify-between items-start">
                <WorkInfo
                  title={state.metadata.workTitle}
                  author={state.metadata.author}
                  adapterName={state.currentAdapter.siteName}
                />
                {state.hasCachedData && (
                  <ClearCacheDialog
                    isDisabled={isOperationDisabled}
                    onClearCache={actions.clearCache}
                    onOpenChange={actions.setShowClearDialog}
                    open={state.showClearDialog}
                  />
                )}
              </div>
            )}
          </div>

          {/* エピソード管理エリア */}
          {state.episodes.length > 0 && (
            <>
              <div className="flex justify-between">
                <SelectionControls
                  selectAll={state.selectAll}
                  showGroupTitles={state.showGroupTitles}
                  isDisabled={isOperationDisabled}
                  onSelectAll={actions.selectAllEpisodes}
                  onToggleGroupTitles={actions.setShowGroupTitles}
                />
                <DownloadControls
                  isDownloading={state.downloadStatus.isDownloading}
                  isGenerating={state.downloadStatus.isGenerating}
                  hasSelectedEpisodes={hasSelectedEpisodes}
                  progress={state.downloadStatus.message}
                  onDownload={actions.downloadEpisodes}
                  onCancel={state.downloadStatus.isDownloading ? actions.cancelDownload : undefined}
                />
              </div>

              <EpisodeTable
                episodes={state.episodes}
                showGroupTitles={state.showGroupTitles}
                onSelectEpisode={actions.selectEpisode}
                className="mt-4"
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};