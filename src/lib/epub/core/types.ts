/**
 * EPUB生成の入力として使用するチャプター情報
 */
export interface InputChapter {
  title: string;
  data: string;
  metadata?: {
    groupTitle?: string;
    date?: string;
    originalUrl?: string;
  };
}

/**
 * EPUBのコンテンツメタデータ
 */
export interface ContentMetadata {
  id: string;
  href: string;
  mediaType: string;
}

/**
 * シリーズ情報の型定義
 */
interface SeriesInfo {
  name: string;
  position: number;
}

/**
 * EPUBのメタデータ
 */
export interface EPUBMetadata {
  title: string;
  author: string;
  publisher: string;
  tocTitle: string;
  lang: string;
  modifiedDate: string;
  content: ContentMetadata[];

  // オプション項目
  description?: string;
  rights?: string;
  published?: string;
  keywords?: string[];
  series?: SeriesInfo;
}