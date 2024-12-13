import React, { useEffect } from 'react';
import NovelDownloader from '@/components/novel-downloader';
import LoggerControls from '@/components/logger-control';
import { setupAdapters } from '@/adapters';

const App: React.FC = () => {
  // アプリケーション起動時にアダプターを登録
  useEffect(() => {
    setupAdapters();
    return () => {
      // クリーンアップ処理は自動的に行われます
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto">
        <NovelDownloader />
        <LoggerControls />
      </div>
    </div>
  );
};

export default App;