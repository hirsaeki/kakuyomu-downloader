/**
 * 変換処理のアクションタイプ
 */
export type TransformAction =
  | 'convertWidth'
  | 'replace'
  | 'splitBy'
  | 'convertEach'
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
 * 変換ステップのインターフェース
 */
export interface ITransformStep {
  // 変換ステップが適用可能かどうかを判定
  isApplicable(context: TransformContext): boolean;
  // 実際の変換処理を実行
  execute(context: TransformContext): Promise<ProcessedText>;
}

/**
 * 変換ステップの設定
 */
export interface TransformStepDefinition {
  action: TransformAction;
  // 各アクション用の設定
  // convertWidth用設定
  target?: 'numbers' | 'alphabet' | 'symbols';
  direction?: 'fullwidth' | 'halfwidth';

  // replace用設定
  from?: string;
  to?: string;

  // splitBy用設定
  separator?: string | string[];

  // convertEach用設定
  rules?: Array<{
    type: 'toKanji' | 'toFullwidth';
    params?: Record<string, unknown>;
  }>;

  // join用設定
  with?: string;
}

/**
 * 変換処理のコンテキスト
 */
export interface TransformContext {
  text: string;
  match?: RegExpMatchArray;
}

/**
 * 処理後のテキスト
 */
export interface ProcessedText {
  content?: string;  // 中間処理用
  textContent: string;  // 最終的なテキスト
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