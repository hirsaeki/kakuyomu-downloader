import { ValidationError } from '@/types';

/*
 * エラー関連の型定義
 */

// パターンローディング時のエラー型
export interface PatternLoadingError extends Error {
  file?: string;
  type: 'validation' | 'filesystem' | 'parse' | 'unknown';
}

// パターン検証エラー
export class PatternValidationError extends ValidationError {
  readonly patternName: string;

  constructor(message: string, patternName: string) {
    super(message);
    this.name = 'PatternValidationError';
    this.patternName = patternName;
  }
}

// パターンローディングエラーを作成する関数
export function createPatternLoadingError(
  message: string,
  type: PatternLoadingError['type'],
  file?: string
): PatternLoadingError {
  const error = new Error(message) as PatternLoadingError;
  error.type = type;
  if (file) error.file = file;
  return error;
}

/*
 * パターン設定関連の型定義
 */

// パターンの基本設定
export interface PatternConfig {
  description?: string;
  basePriority: number;
  patterns: PatternDefinition[];
  options?: {
    disabled?: boolean;
  };
}

// 個別のパターン定義
export interface PatternDefinition {
  name: string;
  description?: string;
  pattern: PatternRegExp;
  transform: TransformConfig;
  disabled?: boolean;
}

// 正規表現パターンの設定
export interface PatternRegExp {
  source: string;
  flags?: string;
  lookbehind?: string;
  lookahead?: string;
}

/*
 * 変換処理関連の型定義
 */

// 変換設定
export interface TransformConfig {
  type: 'text' | 'tcy';
  steps: TransformStep[];
  ensureSpace?: {
    after?: boolean;
    before?: boolean;
  };
}

// 変換アクションの種類
export type TransformAction =
  | 'convertWidth'
  | 'splitBy'
  | 'convertEach'
  | 'join'
  | 'convertGroups'
  | 'replace'
  | 'wrap'
  | 'processGroup';

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
  rules?: ConversionRule[];
  template?: string;
  with?: string;
  from?: string;
  to?: string;
  prefix?: string;
  suffix?: string;
  group?: number;
}

// 変換ルール
export interface ConversionRule {
  type: string;
  group?: number;
  params?: Record<string, unknown>;
}

/*
 * 処理実行関連の型定義
 */

// パターンマッチの結果
export interface PatternMatch {
  pattern: PatternDefinition;
  match: RegExpExecArray;
  priority: number;
}

// 処理済み範囲の定義
export interface ProcessedRange {
  start: number;
  end: number;
  pattern: string;
}

// 処理コンテキスト
export interface ProcessingContext {
  depth: number;
  startTime: number;
  processingChain: string[];
  processedRanges: ProcessedRange[];
}

// 処理結果
export interface ProcessingResult {
  success: boolean;
  nodes: Node[];
  error: string | null;
}

// 基本エラー型の再エクスポート
export { ValidationError };
