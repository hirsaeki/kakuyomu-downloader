import { Blob } from 'buffer';
import type { TextTransformRule } from '@/lib/typography/core/processor/types';

export interface EPUBGeneratorResult {
  success: boolean;
  error?: string;
  blob?: Blob;
}

export interface EPUBGeneratorOptions {
  /**
   * タイトル（必須）
   */
  title: string;

  /**
   * 著者名（必須）
   */
  author: string;

  /**
   * 出版社（オプション）
   * デフォルト値はEPUB_CONFIG.DEFAULTS.PUBLISHERから取得
   */
  publisher?: string;

  /**
   * 目次タイトル（オプション）
   * デフォルト値はEPUB_CONFIG.DEFAULTS.TOC_TITLEから取得
   */
  tocTitle?: string;

  /**
   * 言語コード（オプション）
   * デフォルト値はEPUB_CONFIG.DEFAULTS.LANGから取得
   */
  lang?: string;

  /**
   * コンテンツの配列（必須）
   */
  content: {
    title: string;
    data: string;
    metadata?: {
      groupTitle?: string;
      date?: string;
      originalUrl?: string;
    };
  }[];

  /**
   * 変換ルール（オプション）
   */
  rules?: TextTransformRule[];
}
