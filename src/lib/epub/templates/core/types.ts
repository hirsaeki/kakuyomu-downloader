import type { EPUBGeneratorOptions } from '../../core/types';

/**
 * テンプレート生成で使用するチャプター情報
 */
export interface OutputChapter {
  filename: string;
  title: string;
  landmark?: string;
  hidden?: boolean;
}

/**
 * メタデータオプションの型定義
 */
export interface MetadataOptions extends EPUBGeneratorOptions {
  modifiedDate?: string;
  published?: string;
  rights?: string;
  description?: string;
  keywords?: string[];
  series?: {
    name: string;
    position: number;
  };
}

/**
 * テンプレート生成の結果型
 */
export interface TemplateResult {
  containerXml: string;
  navXhtml?: string;
  contentOpf?: string;
}