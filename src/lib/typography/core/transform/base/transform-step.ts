import type { TransformContext, TransformResult } from './types';
import { TransformError } from '@/lib/errors';

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
    if (!context) {
      throw new TransformError('変換コンテキストが指定されていません');
    }
    return context.text !== null && context.text !== undefined;
  }

  async execute(context: TransformContext): Promise<TransformResult> {
    try {
      if (!this.isApplicable(context)) {
        throw new TransformError('このコンテキストは変換できません');
      }
      return await this.processTransform(context);
    } catch (error) {
      if (error instanceof TransformError) {
        throw error;
      }
      throw new TransformError(
        error instanceof Error ? error.message : '変換処理に失敗しました'
      );
    }
  }

  /**
   * 実際の変換処理を実装するメソッド
   * サブクラスでオーバーライドする
   */
  protected abstract processTransform(context: TransformContext): Promise<TransformResult>;

  protected createResult(content: string, type: 'text' | 'tcy' = 'text'): TransformResult {
    return { type, content };
  }
}