import { BaseTransformStep } from '../../base/transform-step';
import type { TransformContext, TransformResult } from '../../base/types';

export class ParagraphTransformStep extends BaseTransformStep {
  protected async processTransform(context: TransformContext): Promise<TransformResult> {
    // 段落を分割（2つ以上の改行で区切る）
    const paragraphs = context.text.split(/\n{2,}/).map(p => p.trim());
    
    // 各段落を処理
    const processedText = paragraphs
      .filter(p => p.length > 0)  // 空の段落を除去
      .map(p => {
        // 段落内の改行を<br />に変換
        const lines = p.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);  // 空行を除去
        
        // XMLの仕様に準拠した自己終了タグ形式を使用
        return `<p>${lines.join('<br />')}</p>`;
      })
      .join('\n');

    return this.createResult(processedText);
  }
}