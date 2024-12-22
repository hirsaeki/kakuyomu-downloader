import { TextTransformRule } from '../../processor/types';

export abstract class BaseTransformRule implements TextTransformRule {
  private readonly _effectivePriority: number;

  constructor(
    public readonly priority: number,
    private readonly patternIndex: number = 0
  ) {
    // 優先度は昇順（小さい数が優先）
    // インデックスは0.001単位で優先度に組み込む
    this._effectivePriority = Math.round(
      (priority + (patternIndex * 0.001)) * 1000
    ) / 1000;
  }

  getPriority(): number {
    return this._effectivePriority;
  }
  abstract transform(text: string): string;

  protected escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}