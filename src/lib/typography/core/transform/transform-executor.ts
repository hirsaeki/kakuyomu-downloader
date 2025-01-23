import { TransformError } from "@/lib/errors";
import { createContextLogger } from "@/lib/logger";
import type { GeneratedPattern } from "virtual:pattern-config";
import { StepFactory } from "./factory/step-factory";
import type { ITransformStep, ProcessedText, TransformContext } from "./types";

const transformLogger = createContextLogger("typography-transform");

/**
 * テキストベースの変換処理を実行するExecutor
 */
export class TransformExecutor {
  private steps: ITransformStep[] = [];

  /**
   * パターンからExecutorを生成するファクトリメソッド
   */
  static fromPattern(pattern: GeneratedPattern): TransformExecutor {
    transformLogger.info("Creating executor from pattern");
    const executor = new TransformExecutor();
    const steps = StepFactory.createFromPattern(pattern);
    transformLogger.debug("Steps created from pattern", {
      stepCount: steps.length,
      patternType: pattern.transform.type,
    });
    steps.forEach((step) => executor.addStep(step));
    return executor;
  }

  /**
   * 変換ステップを追加
   */
  private addStep(step: ITransformStep): this {
    transformLogger.debug("Adding transform step", {
      stepType: step.constructor.name,
    });
    this.steps.push(step);
    return this;
  }

  /**
   * 変換処理を実行
   */
  async execute(
    context: TransformContext,
    pattern: GeneratedPattern
  ): Promise<ProcessedText> {
    transformLogger.info("Starting transform execution", {
      initialTextLength: context.text?.length ?? 0,
      stepsCount: this.steps.length,
      patternName: pattern.name,
      targetType: pattern.transform.type,
    });

    // 変換処理の実行
    const { textContent: processedText } =
      await this.executeTransformSteps(context);

    // TCYの場合はマーカーで囲む
    let resultText = processedText;
    if (pattern.transform.type === "tcy") {
      transformLogger.debug("Adding TCY markers", {
        pattern: pattern.name,
        text: processedText,
      });
      resultText = `〘${processedText}〙`;
    }

    // 前後の空白を制御
    const { ensureSpace } = pattern.transform;
    if (ensureSpace) {
      if (ensureSpace.before && !resultText.startsWith(" ")) {
        resultText = ` ${resultText}`;
      }
      if (ensureSpace.after && !resultText.endsWith(" ")) {
        resultText = `${resultText} `;
      }
    }

    transformLogger.info("Transform execution completed", {
      finalTextLength: resultText.length,
      nodeType: pattern.transform.type,
      stepsExecuted: this.steps.length,
      ensureSpaceBefore: ensureSpace?.before,
      ensureSpaceAfter: ensureSpace?.after,
    });

    return { textContent: resultText };
  }

  /**
   * 全ての変換ステップを実行
   */
  private async executeTransformSteps(
    context: TransformContext
  ): Promise<ProcessedText> {
    if (!context.text) {
      transformLogger.error("Transform execution failed: No text provided");
      throw new TransformError("No text provided for transformation");
    }

    if (this.steps.length === 0) {
      transformLogger.warn("No transform steps registered");
      return { textContent: context.text };
    }

    let currentText = context.text;
    const originalMatch = context.match;  // 元のマッチ情報を保持

    transformLogger.debug('Starting transform steps', {
      stepsCount: this.steps.length,
      initialText: currentText.substring(0, 100)
    });

    for (const step of this.steps) {
      try {
        // ステップ実行用の新しいコンテキストを作成
        // 元のマッチ情報は読み取り専用で渡し、ステップ独自のマッチ情報はクリア
        const stepContext = {
          text: currentText,
          originalMatch,  // 元のマッチ情報
          match: undefined,  // ステップ独自のマッチはクリア
          params: context.params  // その他のパラメータは維持
        };

        transformLogger.debug(`Executing step: ${step.constructor.name}`, {
          currentTextLength: currentText.length,
          textSample: currentText.substring(0, 50)
        });

        // ステップを実行し、結果を次のステップの入力として使用
        const result = await step.execute(stepContext);
        currentText = result.textContent;

        transformLogger.debug(`Step completed: ${step.constructor.name}`, {
          newTextLength: currentText.length,
          textSample: currentText.substring(0, 50)
        });

      } catch (error) {
        // エラー時はログを記録するが、処理は継続
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        transformLogger.error(`Step failed: ${step.constructor.name}`, {
          error: errorMessage,
          content: currentText.substring(0, 100)
        });
        // エラーが発生したステップはスキップして次へ
        continue;
      }
    }

    transformLogger.debug('Transform steps completed', {
      finalTextLength: currentText.length,
      finalText: currentText.substring(0, 100)
    });

    return { textContent: currentText };
  }

  // 適用可否判定は削除 - 全ステップを必ず適用する設計に変更
}
