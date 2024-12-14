import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LucideIcon } from 'lucide-react';

interface BaseAlertProps {
  message: string;
  icon: LucideIcon;
  variant?: 'default' | 'destructive';
  className?: string;
}

/**
 * 基本的なアラート表示のベースコンポーネント
 * 
 * @remarks
 * - アイコンと警告メッセージを表示
 * - デフォルトとdestructiveの2種類のバリアントをサポート
 * - スタイルのカスタマイズが可能
 * 
 * @param props - コンポーネントのプロパティ
 * @returns アラートコンポーネント
 */
export const BaseAlert: React.FC<BaseAlertProps> = ({ 
  message, 
  icon: Icon, 
  variant = 'default',
  className
}) => (
  <Alert 
    variant={variant} 
    className={`mb-4 ${className || ''} flex items-center`}
    role="alert"
  >
    <Icon className="h-4 w-4 shrink-0" />
    <AlertDescription className="ml-2">
      {message}
    </AlertDescription>
  </Alert>
);
