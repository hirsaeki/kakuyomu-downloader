import React from 'react';
import { BaseAlert } from './base-alert';
import { XCircle, Loader2, AlertCircle, InfoIcon } from 'lucide-react';

/**
 * エラーアラートコンポーネント
 * @param props - message: エラーメッセージ
 */
export const ErrorAlert: React.FC<{ message: string; className?: string }> = (props) => (
  <BaseAlert 
    icon={XCircle} 
    variant="destructive" 
    {...props} 
  />
);

/**
 * 進捗表示アラートコンポーネント
 * @param props - message: 進捗メッセージ
 */
export const ProgressAlert: React.FC<{ message: string; className?: string }> = (props) => (
  <BaseAlert 
    icon={Loader2} 
    {...props} 
  />
);

/**
 * 警告アラートコンポーネント
 * @param props - message: 警告メッセージ
 */
export const WarningAlert: React.FC<{ message: string; className?: string }> = (props) => (
  <BaseAlert 
    icon={AlertCircle} 
    {...props} 
  />
);

/**
 * 情報アラートコンポーネント
 * @param props - message: 情報メッセージ
 */
export const InfoAlert: React.FC<{ message: string; className?: string }> = (props) => (
  <BaseAlert 
    icon={InfoIcon} 
    {...props} 
  />
);
