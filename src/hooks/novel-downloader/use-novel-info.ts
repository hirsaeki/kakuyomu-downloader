import { useState, useEffect } from 'react';
import { BaseNovelSiteAdapter, NovelSiteAdapterFactory } from '@/adapters';
import { createContextLogger } from '@/lib/logger';

const infoLogger = createContextLogger('novel-info-hook');

export const useNovelInfo = (factory: NovelSiteAdapterFactory) => {
  const [url, setUrl] = useState<string>('');
  const [workTitle, setWorkTitle] = useState<string>('');
  const [author, setAuthor] = useState<string>('');
  const [currentAdapter, setCurrentAdapter] = useState<BaseNovelSiteAdapter | null>(null);

  // URL変更時のアダプター検出
  useEffect(() => {
    if (!url) {
      setCurrentAdapter(null);
      return;
    }

    try {
      const adapter = factory.getAdapter(url);
      setCurrentAdapter(adapter);
      
      if (!adapter) {
        infoLogger.debug('No compatible adapter found for URL', { url });
      }
    } catch (error) {
      infoLogger.error('Error detecting adapter', error);
      setCurrentAdapter(null);
    }
  }, [url, factory]);

  const updateMetadata = (title: string, novelAuthor: string) => {
    if (!title?.trim() || !novelAuthor?.trim()) {
      infoLogger.warn('Invalid metadata received', { title, author: novelAuthor });
      return;
    }

    setWorkTitle(title);
    setAuthor(novelAuthor);
  };

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