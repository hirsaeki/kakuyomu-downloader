import { useState, useEffect } from 'react';
import { NovelSiteAdapter } from '@/adapters/types';
import { adapterRegistry } from '@/adapters/factory';
import { createContextLogger } from '@/lib/logger';

const infoLogger = createContextLogger('novel-info-hook');

export const useNovelInfo = () => {
  const [url, setUrl] = useState<string>('');
  const [workTitle, setWorkTitle] = useState<string>('');
  const [author, setAuthor] = useState<string>('');
  const [currentAdapter, setCurrentAdapter] = useState<NovelSiteAdapter | null>(null);

  // URL変更時のアダプター検出...ふん、こんな単純な処理に説明はいらないでしょ？
  useEffect(() => {
    if (!url) {
      setCurrentAdapter(null);
      return;
    }

    try {
      const adapter = adapterRegistry.getAdapter(url);
      setCurrentAdapter(adapter);
      
      if (!adapter) {
        infoLogger.debug('No compatible adapter found for URL', { url });
      }
    } catch (error) {
      infoLogger.error('Error detecting adapter', error);
      setCurrentAdapter(null);
    }
  }, [url]);

  // メタデータの更新...まぁ、これくらいの機能は当たり前よね
  const updateMetadata = (title: string, novelAuthor: string) => {
    if (!title?.trim() || !novelAuthor?.trim()) {
      infoLogger.warn('Invalid metadata received', { title, author: novelAuthor });
      return;
    }

    setWorkTitle(title);
    setAuthor(novelAuthor);
  };

  // メタデータのクリア...って、これ以上簡単な実装なんてないでしょ？
  const clearMetadata = () => {
    setWorkTitle('');
    setAuthor('');
  };

  return {
    url,
    workTitle,
    author,
    currentAdapter,
    setUrl,
    updateMetadata,
    clearMetadata
  };
};
