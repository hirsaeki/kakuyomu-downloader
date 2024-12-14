import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface ClearCacheDialogProps {
  isDisabled?: boolean;
  onClearCache: () => void;
}

/**
 * キャッシュクリアの確認ダイアログコンポーネント
 * 
 * @remarks
 * キャッシュクリア前に確認ダイアログを表示し、
 * ユーザーの意図しない操作を防止します。
 * 
 * @param props - コンポーネントのプロパティ
 * @returns キャッシュクリアダイアログコンポーネント
 */
export const ClearCacheDialog: React.FC<ClearCacheDialogProps> = ({
  isDisabled = false,
  onClearCache
}) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className="space-x-2"
          disabled={isDisabled}
        >
          <Trash2 className="h-4 w-4" />
          <span>キャッシュをクリア</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>キャッシュをクリアしますか？</AlertDialogTitle>
          <AlertDialogDescription>
            この操作を実行すると、ダウンロードしたエピソードのキャッシュがすべて削除されます。
            再度ダウンロードする際は、サーバーから新しくデータを取得する必要があります。
            この操作は取り消せません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={onClearCache}
            className="bg-destructive hover:bg-destructive/90"
          >
            クリア
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
