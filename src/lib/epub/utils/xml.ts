import { EPUB_CONFIG } from '@/config/constants';

/**
 * XMLで使用できない文字をエスケープします
 */
export function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, char => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;'
  }[char] || char));
}