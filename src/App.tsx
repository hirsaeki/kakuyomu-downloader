import React from 'react';
import { NovelDownloader } from '@/components/features/novel-downloader';
import { LoggerControls } from '@/components/features/logger';
import { AdapterProvider } from '@/contexts/adapter-context';

const App: React.FC = () => {
  return (
    <AdapterProvider>
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="container mx-auto">
          <NovelDownloader />
          <LoggerControls />
        </div>
      </div>
    </AdapterProvider>
  );
};

export default App;