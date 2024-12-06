// 変換アクションの種類
export type TransformAction =
  | 'convertWidth'    // 文字幅の変換
  | 'splitBy'         // 文字列の分割
  | 'convertEach'     // 個別要素の変換
  | 'join'           // 文字列の結合
  | 'convertGroups'   // グループ単位の変換
  | 'replace'         // 文字列の置換
  | 'wrap'           // 文字列の囲み処理
  | 'processGroup';   // グループ内テキストの再処理

// 文字幅変換の対象
export type WidthTarget = 'numbers' | 'alphabet' | 'symbols';

// 文字幅変換の方向
export type WidthDirection = 'fullwidth' | 'halfwidth';

// 変換ステップの定義
export interface TransformStep {
  action: TransformAction;
  target?: WidthTarget;
  direction?: WidthDirection;
  separator?: string | string[];
  rules?: Array<{
    type: string;
    group?: number;
  }>;
  template?: string;
  with?: string;
  from?: string;
  to?: string;
  prefix?: string;
  suffix?: string;
  group?: number;
}

// 変換設定
export interface TransformConfig {
  type: 'text' | 'tcy';  // 通常テキストまたは縦中横
  steps: TransformStep[];
  ensureSpace?: {
    after?: boolean;
    before?: boolean;
  };
}

// 正規表現パターン設定
export interface PatternRegExp {
  source: string;
  flags?: string;
  lookbehind?: string;
  lookahead?: string;
}

// パターン定義
export interface PatternDefinition {
  name: string;
  description?: string;
  pattern: PatternRegExp;
  transform: TransformConfig;
  disabled?: boolean;     // パターンの有効/無効状態
}

// パターン設定ファイル全体の構造
export interface PatternConfig {
  description?: string;   // パターンファイルの説明
  basePriority: number;   // このファイル内のパターンの基準優先度
  patterns: PatternDefinition[];  // パターンは配列の順序で優先度が決まる
  options?: {
    disabled?: boolean;   // このファイル全体の有効/無効
  };
}

// 変換ルールの型
export interface ConversionRule {
  type: string;
  params?: Record<string, unknown>;
}

// パターンマッチの結果
export interface PatternMatch {
  pattern: PatternDefinition;
  match: RegExpExecArray;
  priority: number;
}

// パターン処理の結果
export interface ProcessingResult {
  success: boolean;
  nodes: Node[];
  error?: string;
}
