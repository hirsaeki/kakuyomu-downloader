import { BaseTransformStep } from '../base/transform-step';
import type { TransformContext, TransformResult } from '../base/types';
import { TransformError } from '@/lib/errors';

/**
 * 段落の変換を行うステップ
 */
export class ParagraphTransformStep extends BaseTransformStep {
  protected async processTransform(context: TransformContext): Promise<TransformResult> {
    try {
      // テキストを行で分割
      const lines = context.text.split('\n');
      const processedLines: string[] = [];

      // 各行を処理
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // 空行は<br/>で処理
        if (!line) {
          processedLines.push(`<p class="blank"><br/></p>`);
          continue;
        }

        // IDを付与した段落タグで囲む
        processedLines.push(`<p id="p${i + 1}">${line}</p>`);
      }

      // 結果を結合
      const result = processedLines.join('\n');

      return this.createResult(result);
    } catch (error) {
      throw new TransformError(
        error instanceof Error ? error.message : '段落変換に失敗しました'
      );
    }
  }

  toString(): string {
    return 'ParagraphTransformStep';
  }
}