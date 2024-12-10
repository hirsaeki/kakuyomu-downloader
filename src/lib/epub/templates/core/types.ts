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
 * テンプレート生成の結果型
 */
export interface TemplateResult {
  containerXml: string;
  navXhtml?: string;
  contentOpf?: string;
}