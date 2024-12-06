import React, { useEffect } from 'react';
import NovelDownloader from './components/NovelDownloader';
import LoggerControls from './components/LoggerControls';
import { adapterRegistry } from './adapters/factory';
import { KakuyomuAdapterFactory } from './adapters/kakuyomu/factory';

const App: React.FC = () => {
  // アプリケーション起動時にアダプターを登録
  useEffect(() => {
    const kakuyomuAdapter = new KakuyomuAdapterFactory().createAdapter({
      httpClient: adapterRegistry.getHttpClient(),
      proxyConfig: {
        endpoint: '/api/fetch-content',
        buildUrl: (url) => `/api/fetch-content?url=${encodeURIComponent(url)}`
      }
    });
    
    adapterRegistry.register(kakuyomuAdapter);
    
    // クリーンアップ
    return () => {
      adapterRegistry.clear();
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
