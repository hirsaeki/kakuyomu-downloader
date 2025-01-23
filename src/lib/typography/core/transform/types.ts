/**
 * 変換処理のアクションタイプ
 */
export type TransformAction = "convertWidth" | "convertKanji" | "replace";

/**
 * 文字幅変換の対象
 */
export type WidthTarget = "numbers" | "alphabet" | "symbols";

/**
 * 文字幅変換の方向
 */
export type WidthDirection = "fullWidth" | "halfWidth";

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
}

/**
 * 変換処理のコンテキスト
 */
export interface TransformContext {
  // 変換対象のテキスト
  text: string;
  // 正規表現マッチ結果（オプショナル）
  match?: RegExpMatchArray;
  // オリジナルのテキスト（オプショナル）
  originalText?: string;
  // ステップ固有のパラメータ（オプショナル）
  params?: Record<string, unknown>;
}

/**
 * 処理後のテキスト
 */
export interface ProcessedText {
  // 処理後のテキスト内容
  textContent: string;
  // 処理結果のメタデータ（オプショナル）
  metadata?: {
    // 元のテキストからの変更があったかどうか
    modified: boolean;
    // 適用されたルール名
    appliedRules?: string[];
    // 変換処理で発生した警告
    warnings?: string[];
  };
}

/**
 * パターン設定の定義
 */
export interface PatternDefinition {
  // パターン名
  name: string;

  // 正規表現パターン設定
  pattern: {
    source: string;
    flags?: string;
  };

  // 変換設定
  transform: TransformConfig;

  // 優先度（任意）。未指定の場合は基本優先度を使用
  priority?: number;
}

/**
 * パターン変換の設定
 */
export interface TransformConfig {
  // 変換タイプ（text: 通常のテキスト変換, tcy: 縦中横用マーカー付与）
  type: "text" | "tcy";

  // 変換ステップの配列
  steps: TransformStepDefinition[];

  // スペース制御オプション
  ensureSpace?: {
    before?: boolean;
    after?: boolean;
  };
}
