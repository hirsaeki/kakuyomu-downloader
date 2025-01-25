import { TransformError } from "@/lib/errors";
import { createContextLogger } from "@/lib/logger";
import type { GeneratedPattern } from "virtual:pattern-config";
import { ConvertKanjiStep, ConvertWidthStep, ReplaceStep } from "../steps";
import { type ITransformStep, type TransformStepDefinition } from "../types";

const factoryLogger = createContextLogger("step-factory");

/**
 * 変換ステップのファクトリクラス
 * Viteプラグインで生成されたパターン定義からTransformStepを生成
 */
export class StepFactory {
  /**
   * パターン定義から変換ステップを生成
   */
  static createFromPattern(pattern: GeneratedPattern): ITransformStep[] {
    factoryLogger.debug("Creating steps from pattern", {
      patternName: pattern.name,
      stepsCount: pattern.transform.steps.length,
    });

    if (!pattern.transform?.steps) {
      factoryLogger.error("Invalid pattern: transform steps are required");
      throw new TransformError("Invalid pattern: transform steps are required");
    }

    return pattern.transform.steps
      .map((step: TransformStepDefinition, index: number) => {
        try {
          return this.createStep(step);
        } catch (error) {
          factoryLogger.error(`Step creation failed at index ${index}`, {
            step,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          return null;
        }
      })
      .filter((step: unknown): step is ITransformStep => step !== null);
  }

  /**
   * 個別のステップを生成
   */
  private static createStep(
    config: TransformStepDefinition
  ): ITransformStep | null {
    try {
      switch (config.action) {
        case "convertWidth":
          if (!config.target || !config.direction) {
            throw new TransformError(
              "Missing target or direction for convertWidth"
            );
          }
          return new ConvertWidthStep(config.direction, config.target);

        case "convertKanji":
          return new ConvertKanjiStep();

        case "replace":
          if (!config.from || config.to == null) {
            throw new TransformError("Missing from or to for replace");
          } else return new ReplaceStep(config.from, config.to);

        default:
          factoryLogger.warn(`Unknown action type: ${config.action}`);
          return null;
      }
    } catch (error) {
      factoryLogger.error(
        `Step creation failed:`,
        error instanceof Error ? error.message : "Unknown error"
      );
      return null;
    }
  }
}
