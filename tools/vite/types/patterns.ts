/**
 * 変換パターンの設定を表す型定義
 * @remarks
 * この型はビルド時のYAMLファイル検証とランタイムでの型チェックの両方で使用されます
 */
export interface PatternConfig {
  rules: {
    [key: string]: {
      pattern: string;
      replacement: string;
      /** ルールの優先度（オプション） */
      priority?: number;
    };
  };
}