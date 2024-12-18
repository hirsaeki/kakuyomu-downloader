import type { ITransformStep, TransformContext, TransformResult } from '../types';
import { TransformError } from '@/lib/errors';
import { createContextLogger } from '@/lib/logger';

const stepLogger = createContextLogger('typography-step');

export abstract class BaseTransformStep implements ITransformStep {
  private readonly name: string;

  constructor() {
    this.name = this.constructor.name;
  }

  isApplicable(context: TransformContext): boolean {
    if (!context) {
        stepLogger.error(`${this.name}: Invalid context provided`);
        throw new TransformError('変換コンテキストが指定されていません');
    }

    // textプロパティの存在と型のチェック
    if (typeof context.text !== 'string') {
        stepLogger.debug(`${this.name}: Invalid text property type`);
        return false;
    }

    // 変換可能性の判定（空文字列は変換可能とする）
    const applicable = true;
    
    stepLogger.debug(`${this.name}: Checking applicability`, {
        applicable,
        textLength: context.text.length
    });

    return applicable;
  }
  //old

  async execute(context: TransformContext): Promise<TransformResult> {
    stepLogger.debug(`${this.name}: Starting execution`, {
      textLength: context.text?.length ?? 0,
      processedRanges: context.processedRanges?.length ?? 0
    });

    try {
      if (!this.isApplicable(context)) {
        stepLogger.warn(`${this.name}: Context not applicable for transformation`);
        throw new TransformError('このコンテキストは変換できません');
      }

      const result = await this.processTransform(context);

      stepLogger.debug(`${this.name}: Execution completed`, {
        resultType: result.type,
        resultLength: result.content.length
      });

      return result;

    } catch (error) {
      stepLogger.error(`${this.name}: Execution failed`, error);

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
    stepLogger.debug(`${this.name}: Creating result`, {
      type,
      contentLength: content.length
    });

    return { type, content };
  }
}