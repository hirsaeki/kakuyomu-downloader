import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BaseNovelSiteAdapter } from '@/adapters';
import { useNovelDownloader } from '@/features/novel-downloader/hooks/use-novel-downloader';
import { useAdapterContext } from '@/features/novel-downloader/hooks/use-adapter-context';
import { ErrorAlert, ProgressAlert, WarningAlert } from './alerts';
import { DownloadControls, SelectionControls, ClearCacheDialog } from './controls';
import { EpisodeTable } from './episode-table';
import { URLInputField } from './url-input-field';
import { WorkInfo } from './work-info';

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
          {state.url && !state.currentAdapter && (
            <WarningAlert 
              message={`対応サイト: ${adapters.map((a: BaseNovelSiteAdapter) => a.siteName).join(', ')}`} 
            />
          )}
          {state.downloadStatus.message && (
            <ProgressAlert message={state.downloadStatus.message} />
          )}

          {/* URL入力エリア */}
          <URLInputField
            url={state.url}
            onUrlChange={actions.setUrl}
            onFetch={actions.fetchEpisodes}
            onClearCache={() => actions.setShowClearDialog(true)}
            isLoading={state.loading}
            isDisabled={isOperationDisabled}
            isClearing={false}  // この状態は新しい実装では不要になったみたい
            hasWorkTitle={!!state.metadata.workTitle}
            currentAdapter={!!state.currentAdapter}
          />

          {/* 作品情報表示エリア */}
          {state.currentAdapter && state.metadata.workTitle && (
            <WorkInfo
              title={state.metadata.workTitle}
              author={state.metadata.author}
              adapterName={state.currentAdapter.siteName}
            />
          )}

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
                downloadStatus={state.downloadStatus.episodes}
                showGroupTitles={state.showGroupTitles}
                onSelectEpisode={actions.selectEpisode}
              />
            </>
          )}
        </div>

        {/* キャッシュクリアダイアログ */}
        <ClearCacheDialog
          isDisabled={isOperationDisabled}
          onClearCache={actions.clearCache}
        />
      </CardContent>
    </Card>
  );
};
