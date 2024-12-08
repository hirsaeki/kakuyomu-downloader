
/**
 * 変換処理のアクションタイプ
 */
export type TransformAction =
  | 'wrap'
  | 'convertWidth'
  | 'replace'
  | 'processGroup'
  | 'splitBy'
  | 'convertEach'
  | 'convertGroups'
  | 'join';

/**
 * 文字幅変換の対象
 */
export type WidthTarget = 'numbers' | 'alphabet' | 'symbols';

/**
 * 文字幅変換の方向
 */
export type WidthDirection = 'fullwidth' | 'halfwidth';

/**
 * 変換ルールの種類
 */
export type ConversionRuleType = 'toKanji' | 'toFullwidth';

/**
 * 変換ルールの定義
 */
export interface ConversionRule {
  type: ConversionRuleType;
  params?: Record<string, unknown>;
}

/**
 * 変換ステップの設定
 */
export interface TransformStep {
  action: TransformAction;
  // 各アクション用の設定
  prefix?: string;
  suffix?: string;
  target?: WidthTarget;
  direction?: WidthDirection;
  from?: string;
  to?: string;
  group?: number;
  rules?: ConversionRule[];
  separator?: string | string[];
  with?: string;
  template?: string;
}

/**
 * 変換処理のコンテキスト
 */
export interface TransformContext {
  text: string;
  match?: RegExpExecArray;
  reprocess?: (text: string) => Promise<Node[]>;
}

/**
 * 処理済み範囲の情報
 */
export interface ProcessedRange {
  start: number;
  end: number;
  pattern: string;
}

/**
 * 変換処理の結果
 */
export interface TransformResult {
  type: 'text' | 'tcy';
  content: string;
}

/**
 * 変換処理のエラー
 */
export class TransformError extends Error {
  constructor(message: string) {
    super(`Transform Error: ${message}`);
    this.name = 'TransformError';
  }
}