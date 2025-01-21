/**
 * 変換処理のアクションタイプ
 */
export type TransformAction =
  | 'convertWidth'
  | 'replace'
  | 'splitBy'
  | 'convertEach'
  | 'join'
  | 'wrap';

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
  // convertWidth用設定
  target?: WidthTarget;
  direction?: WidthDirection;

  // replace用設定
  from?: string;
  to?: string;

  // splitBy用設定
  separator?: string | string[];

  // convertEach用設定
  rules?: ConversionRule[];

  // join用設定
  with?: string;

  // wrap用設定
  prefix?: string;
  suffix?: string;
}

/**
 * 変換処理のコンテキスト
 */
export interface TransformContext {
  // 変換対象のテキスト
  text: string;
  // 正規表現マッチ結果（オプショナル）
  match?: RegExpMatchArray;
}

/**
 * 処理後のテキスト
 */
export interface ProcessedText {
  // 処理後のテキスト内容
  textContent: string;
}

/**
 * パターン変換の設定
 */
export interface TransformConfig {
  // 変換タイプ（text: 通常のテキスト変換, tcy: 縦中横用マーカー付与）
  type: 'text' | 'tcy';

  // 変換ステップの配列
  steps: TransformStepDefinition[];

  // スペース制御オプション
  ensureSpace?: {
    before?: boolean;
    after?: boolean;
  };
}