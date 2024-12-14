import React from 'react';
import { AdapterContext } from '@/contexts/adapter-context';

/**
 * アダプターコンテキストを取得するカスタムフック
 * 
 * @throws {Error} AdapterProvider の外で使用された場合
 * @returns アダプターファクトリーのインスタンス
 */
export const useAdapterContext = () => {
  const context = React.useContext(AdapterContext);
  if (!context) {
    throw new Error('useAdapterContext must be used within AdapterProvider');
  }
  return context;
};
