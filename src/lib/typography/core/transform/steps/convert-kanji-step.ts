import { TransformError } from "@/lib/errors";
import { createContextLogger } from "@/lib/logger";
import { BaseTransformStep } from "../base/transform-step";
import type { ProcessedText, TransformContext } from "../types";
import { ConvertWidthStep } from "./convert-width-step";

const kanjiLogger = createContextLogger("convert-kanji-step");

/**
 * 数値を漢数字に変換するステップ
 * 特徴：数字以外の文字はそのまま保持する
 */
export class ConvertKanjiStep extends BaseTransformStep {
  private static readonly KANJI_NUMS = [
    "〇", "一", "二", "三", "四",
    "五", "六", "七", "八", "九",
  ] as const;

  private static readonly NUMBER_PATTERN = /[0-9０-９]/; // 一文字の判定に変更
  private readonly widthConverter = new ConvertWidthStep("halfWidth", "numbers");

  constructor() {
    super();
    kanjiLogger.debug("Initialized kanji converter");
  }

  protected async processTransform(
    context: TransformContext
  ): Promise<ProcessedText> {
    if (!super.isApplicable(context)) {
      throw new TransformError("変換処理対象外です");
    }
    try {
      let result = '';
      for (const char of context.text) {
        result += await this.convertChar(char);
      }

      kanjiLogger.debug("Conversion completed", {
        original: context.text,
        converted: result,
      });

      return this.createResult(result);
    } catch (error) {
      const message = `漢数字変換に失敗しました: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      kanjiLogger.error("Conversion failed", {
        error: message,
        text: context.text,
      });
      throw new TransformError(message);
    }
  }

  /**
   * 一文字ずつの変換を行う
   * 数字の場合は漢数字に変換し、それ以外はそのまま返す
   */
  private async convertChar(char: string): Promise<string> {
    if (!ConvertKanjiStep.NUMBER_PATTERN.test(char)) {
      return char;
    }

    // 全角数字は一度半角に変換してから処理
    if (/[０-９]/.test(char)) {
      const halfWidth = await this.widthConverter.execute({ text: char });
      char = halfWidth.textContent;
    }

    // この時点でcharは半角数字のはず
    const num = parseInt(char, 10);
    if (isNaN(num) || num < 0 || num > 9) {
      throw new Error(`Invalid digit: ${char}`);
    }
    return ConvertKanjiStep.KANJI_NUMS[num];
  }

  toString(): string {
    return "ConvertKanjiStep()";
  }
}