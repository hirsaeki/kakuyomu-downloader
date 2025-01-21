import { createContextLogger } from '@/lib/logger';

const lineBreakLogger = createContextLogger('line-break-processor');

/**
 * 段落内の改行コードを<br />タグに変換するプロセッサー
 */
export class LineBreakProcessor {
  /**
   * 段落内の改行コードを<br />タグに変換する
   * @param text 処理対象のテキスト
   * @returns 処理済みのテキスト
   */
  process(text: string): string {
    lineBreakLogger.debug('改行処理を開始', { textLength: text.length });
    
    const processed = text.replace(/\n/g, '<br />\n');
    
    lineBreakLogger.debug('改行処理が完了', {
      processedLength: processed.length,
      sampleText: processed.slice(0, 100)
    });
    
    return processed;
  }
}