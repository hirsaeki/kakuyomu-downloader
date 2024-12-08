import { BaseTransformStep } from '../base/transform-step';
import type { TransformContext, TransformResult } from '../base/types';
import { TransformError } from '../base/types';

export class JoinStep extends BaseTransformStep {
  constructor(
    private template?: string,
    private separator: string = ''
  ) {
    super();
  }

  override isApplicable({ text }: TransformContext): boolean {
    if (!super.isApplicable({ text })) return false;
    try {
      // JSON配列としてパース可能かチェック
      const parts = JSON.parse(text);
      return Array.isArray(parts) && parts.every(p => typeof p === 'string');
    } catch {
      // テンプレートモードの場合は単一文字列も許容
      return this.template !== undefined;
    }
  }

  async execute({ text }: TransformContext): Promise<TransformResult> {
    if (!this.isApplicable({ text })) {
      throw new TransformError('Invalid text content for JoinStep');
    }

    try {
      let parts: string[];
      try {
        parts = JSON.parse(text);
        if (!Array.isArray(parts)) {
          parts = [text];
        }
      } catch {
        parts = [text];
      }

      let result: string;
      
      if (this.template) {
        result = this.applyTemplate(parts, this.template);
      } else {
        result = parts.join(this.separator);
      }

      return this.createResult(result);

    } catch (error) {
      throw new TransformError(
        `Join operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private applyTemplate(parts: string[], template: string): string {
    return template.replace(/\{(\d+)\}/g, (_, index) => {
      const i = parseInt(index, 10) - 1;
      return i >= 0 && i < parts.length ? parts[i] : '';
    });
  }

  toString(): string {
    return `JoinStep(${this.template ? `template: ${this.template}` : `separator: ${this.separator}`})`;
  }
}