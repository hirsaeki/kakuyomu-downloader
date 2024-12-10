import {
  type TransformContext,
  type TransformResult,
  type PatternConfig,
} from '../base/types';
import { TransformError } from '@/lib/errors';
import { BaseTransformStep } from '../base/transform-step';
import { ParagraphTransformStep } from './steps';

interface EpubTransformOptions {
  enableRuby?: boolean;  // 将来的にルビ処理が必要になったら
  enableTcy?: boolean;   // 縦中横の有効/無効
}

export class EpubTransformer extends BaseTransformStep {
  private steps: BaseTransformStep[] = [];

  constructor(
    patterns: PatternConfig[],  // privateを削除（現時点では使用しないため）
    options: EpubTransformOptions = {
      enableRuby: false,
      enableTcy: true
    }
  ) {
    super();
    
    // 基本的な段落処理は常に有効
    this.steps.push(new ParagraphTransformStep());
    
    // 将来的にoptionsに基づいてステップを追加
    if (options.enableTcy) {
      // TODO: 縦中横処理のステップを追加
    }

    // 将来的にpatternsに基づいてステップを追加
    if (patterns.length > 0) {
      // TODO: パターンベースの変換ステップを追加
    }
  }

  protected async processTransform(context: TransformContext): Promise<TransformResult> {
    try {
      let currentText = context.text;

      // 各ステップを順番に適用
      for (const step of this.steps) {
        const result = await step.execute({ ...context, text: currentText });
        currentText = result.content;
      }

      return this.createResult(currentText);
    } catch (error) {
      throw new TransformError(
        error instanceof Error ? error.message : 'EPUB変換処理に失敗しました'
      );
    }
  }

  toString(): string {
    return `EpubTransformer(steps: ${this.steps.length})`;
  }
}