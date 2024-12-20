import { TextProcessingError } from '@/lib/text-processing/core/processing-error';

export function generateUUID(): string {
  try {
    // crypto.randomUUID()が使える場合はそちらを優先
    if (crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // フォールバック実装
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  } catch {
    throw new TextProcessingError('Failed to generate UUID');
  }
}

// XMLエスケープ文字の定数定義
const XML_ESCAPE_MAP: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  "'": '&apos;',
  '"': '&quot;'
} as const;

export function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, char => XML_ESCAPE_MAP[char]);
}

// ファイル名として使用できない文字を置換
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'untitled';
  return filename
    .replace(/[<>:"/\\|?*]+/g, '_')
    .replace(/\s+/g, '_')
    .trim()
    .slice(0, 255); // 最大長を制限
}

// 日付文字列をISO 8601形式に変換
export function formatDate(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) {
      throw new Error('Invalid date');
    }
    return d.toISOString().split('.')[0] + 'Z';
  } catch {
    return new Date().toISOString().split('.')[0] + 'Z';
  }
}