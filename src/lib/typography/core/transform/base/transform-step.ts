import type { ITransformStep, TransformContext, ProcessedText } from '../types';
import { TransformError } from '@/lib/errors';
import { createContextLogger } from '@/lib/logger';

const stepLogger = createContextLogger('typography-step');

/**
 * 変換ステップの基底クラス
 * テキストベースの変換処理を提供する
 */
export abstract class BaseTransformStep implements ITransformStep {
  private readonly name: string;

  constructor() {
    this.name = this.constructor.name;
  }

  /**
   * コンテキストが変換可能かどうかを判定
   * @param context 変換コンテキスト
   * @returns 変換可能な場合はtrue
   */
  isApplicable(context: TransformContext): boolean {
    // コンテキストの存在チェック
    if (!context) {
      stepLogger.error(`${this.name}: No context provided`);
      throw new TransformError('変換コンテキストが指定されていません');
    }

    // textの存在チェック
    if (!('text' in context)) {
      stepLogger.error(`${this.name}: Missing required 'text' property in context`);
      throw new TransformError('コンテキストにtextプロパティがありません');
    }

    // textの型チェック
    if (typeof context.text !== 'string') {
      stepLogger.error(`${this.name}: Invalid text property type`, {
        type: typeof context.text
      });
      throw new TransformError('テキストが文字列ではありません');
    }

    // 空文字列のチェック
    if (context.text.length === 0) {
      stepLogger.debug(`${this.name}: Empty text provided`);
      return false;
    }

    // matchプロパティのチェック（存在する場合）
    if ('match' in context && context.match) {
      if (!Array.isArray(context.match)) {
        stepLogger.error(`${this.name}: Invalid match property type`, {
          type: typeof context.match
        });
        throw new TransformError('matchプロパティが配列ではありません');
      }
    }

    stepLogger.debug(`${this.name}: Context validation passed`, {
      textLength: context.text.length,
      hasMatch: 'match' in context
    });

    return true;
  }

  /**
   * 変換処理を実行
   * @param context 変換コンテキスト
   * @returns 処理後のテキスト
   */
  async execute(context: TransformContext): Promise<ProcessedText> {
    stepLogger.debug(`${this.name}: Starting execution`, {
      textLength: context.text?.length ?? 0,
      hasMatch: !!context.match,
      hasParams: !!context.params
    });

    try {
      if (!this.isApplicable(context)) {
        stepLogger.warn(`${this.name}: Context not applicable for transformation`);
        throw new TransformError('このコンテキストは変換できません');
      }

      const result = await this.processTransform(context);

      stepLogger.debug(`${this.name}: Execution completed`, {
        resultLength: result.textContent.length
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
   * @param context 変換コンテキスト
   * @returns 処理後のテキスト
   */
  protected abstract processTransform(context: TransformContext): Promise<ProcessedText>;

  /**
   * 変換結果を生成するヘルパーメソッド
   * @param text 処理後のテキスト
   * @returns ProcessedText形式の結果
   */
  protected createResult(text: string): ProcessedText {
    stepLogger.debug(`${this.name}: Creating result`, {
      textLength: text.length
    });

    return {
      textContent: text,
      metadata: {
        modified: true
      }
    };
  }
}