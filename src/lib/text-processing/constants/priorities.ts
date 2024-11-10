export const ProcessingPriority = {
  STRUCTURE: 1,    // 文章構造
  COMPOUND: 2,     // 複合パターン
  NUMERIC: 3,      // 数値パターン
  SYMBOL: 4,       // 記号パターン
  ENGLISH: 5,      // 英単語パターン
} as const;

export type ProcessingPriorityType = typeof ProcessingPriority[keyof typeof ProcessingPriority];
