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
export interface ITransformStep {
  // 変換ステップが適用可能かどうかを判定
  isApplicable(context: TransformContext): boolean;
  // 実際の変換処理を実行
  execute(context: TransformContext): Promise<ProcessedText>;
}

export interface TransformStepDefinition {
  action: TransformAction;
  // 各アクション用の設定
  // wrap用設定
  prefix?: string;
  suffix?: string;

  // convertWidth用設定
  target?: 'numbers' | 'alphabet' | 'symbols';
  direction?: 'fullwidth' | 'halfwidth';

  // replace用設定
  from?: string;
  to?: string;

  // processGroup用設定
  group?: number;

  // splitBy用設定
  separator?: string | string[];

  // convertEach, convertGroups用設定
  rules?: Array<{
    group?: number;
    type: 'toKanji' | 'toFullwidth';
    params?: Record<string, unknown>;
  }>;

  // join用設定
  with?: string;
  template?: string;
}

/**
 * パターン設定の型定義
 */
export interface PatternConfig {
  pattern: string;  // 正規表現パターン
  transform: TransformStepDefinition[];  // 変換ステップの配列
  priority?: number;  // 優先度（オプション）
  description?: string;  // パターンの説明（オプション）
}

/**
 * 変換処理のコンテキスト
 */
export interface TransformContext {
  text: string;
  match?: RegExpMatchArray;
  reprocess?: (text: string) => Promise<Node[]>;
}

/**
 * 変換後のテキスト
 */
export interface ProcessedText {
  content: string;
}

/**
 * パターン変換の設定
 */
export interface TransformConfig {
  // 変換タイプ
  type: 'text' | 'tcy';

  // 変換ステップの配列
  steps: TransformStepDefinition[];

  // スペース制御
  ensureSpace?: {
    before?: boolean;
    after?: boolean;
  };
}