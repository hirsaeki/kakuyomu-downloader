import React from 'react';
import { NovelSiteAdapterFactory, setupAdapters } from '@/adapters';

export const AdapterContext = React.createContext<NovelSiteAdapterFactory | null>(null);

export const AdapterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [factory, setFactory] = React.useState<NovelSiteAdapterFactory | null>(null);
  
  React.useEffect(() => {
    setFactory(setupAdapters());
  }, []);
  
  if (!factory) return null;  // 初期化中はnullを返す
  
  return (
    <AdapterContext.Provider value={factory}>
      {children}
    </AdapterContext.Provider>
  );
};