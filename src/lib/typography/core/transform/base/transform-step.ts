import type { TransformContext, TransformResult } from './types';

export interface TransformStep {
  /**
   * 変換ステップが適用可能かどうかを判定
   */
  isApplicable(context: TransformContext): boolean;

  /**
   * 実際の変換処理を実行
   */
  execute(context: TransformContext): Promise<TransformResult>;
}

export abstract class BaseTransformStep implements TransformStep {
  isApplicable(context: TransformContext): boolean {
    return context.text !== null && context.text !== undefined;
  }

  abstract execute(context: TransformContext): Promise<TransformResult>;

  protected createResult(content: string, type: 'text' | 'tcy' = 'text'): TransformResult {
    return { type, content };
  }
}