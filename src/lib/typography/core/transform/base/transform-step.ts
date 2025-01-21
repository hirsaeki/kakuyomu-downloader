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
    if (!context) {
      stepLogger.error(`${this.name}: Invalid context provided`);
      throw new TransformError('変換コンテキストが指定されていません');
    }

    // テキストの存在と型のチェック
    if (typeof context.text !== 'string') {
      stepLogger.debug(`${this.name}: Invalid text property type`);
      return false;
    }

    stepLogger.debug(`${this.name}: Checking applicability`, {
      textLength: context.text.length
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
      textLength: context.text?.length ?? 0
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

    return { textContent: text };
  }
}