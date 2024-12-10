import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// キャッシュクリア確認ダイアログ
export const ClearCacheDialog = ({
  isOpen,
  onConfirm,
  onCancel
}: DialogProps) => (
  <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>キャッシュの削除</AlertDialogTitle>
        <AlertDialogDescription>
          この作品のキャッシュをすべて削除しますか？
          ダウンロードの際に再度サーバーからデータを取得する必要があります。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onCancel}>キャンセル</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>削除する</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
