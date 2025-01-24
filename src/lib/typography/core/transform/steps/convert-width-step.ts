import { TransformError } from "@/lib/errors";
import { createContextLogger } from "@/lib/logger";
import { BaseTransformStep } from "../base/transform-step";
import type {
  ProcessedText,
  TransformContext,
  WidthDirection,
  WidthTarget,
} from "../types";

const widthLogger = createContextLogger("convert-width-step");

/**
 * 文字幅変換処理を行うステップクラス
 * 特徴：対象文字種以外の文字はそのまま保持する
 */
export class ConvertWidthStep extends BaseTransformStep {
  private static readonly SYMBOL_MAP: Record<string, string> = {
    "!": "！",
    '"': "”",
    "#": "＃",
    "\$": "＄",
    "%": "％",
    "&": "＆",
    "'": "’",
    "(": "（",
    ")": "）",
    "*": "＊",
    "+": "＋",
    ",": "，",
    "-": "－",
    ".": "．",
    "/": "／",
    ":": "：",
    ";": "；",
    "<": "＜",
    "=": "＝",
    ">": "＞",
    "?": "？",
    "@": "＠",
    "[": "［",
    "\\": "＼",
    "]": "］",
    "^": "＾",
    "\_": "＿",
    "`": "｀",
    "{": "｛",
    "|": "｜",
    "}": "｝",
    "~": "～",
    " ": "　",
  };

  private static readonly REVERSE_SYMBOL_MAP: Record<string, string> =
    Object.fromEntries(
      Object.entries(ConvertWidthStep.SYMBOL_MAP).map(([k, v]) => [v, k])
    );

  constructor(
    private direction: WidthDirection,
    private target: WidthTarget
  ) {
    super();
    widthLogger.debug("Initialized width converter", {
      direction,
      target,
    });
  }

  protected async processTransform(
    context: TransformContext
  ): Promise<ProcessedText> {
    if (!super.isApplicable(context)) {
      throw new TransformError("変換処理対象外です");
    }
    try {
      let result = "";
      for (const char of context.text) {
        result += this.convertChar(char);
      }

      widthLogger.debug("Conversion completed", {
        original: context.text,
        converted: result,
      });

      return this.createResult(result);
    } catch (error) {
      const message = `文字幅変換に失敗しました: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      widthLogger.error("Conversion failed", {
        error: message,
        text: context.text,
      });
      throw new TransformError(message);
    }
  }

  /**
   * 一文字が変換対象かどうかを判定
   */
  private isTargetCharacter(char: string): boolean {
    switch (this.target) {
      case "numbers":
        // 半角への変換なら全角数字のみ、全角への変換なら半角数字のみを対象に
        return this.direction === "halfWidth"
          ? /[０-９]/.test(char)
          : /[0-9]/.test(char);
      case "alphabet":
        // 同様に、半角への変換なら全角アルファベットのみ、全角への変換なら半角アルファベットのみ
        return this.direction === "halfWidth"
          ? /[ａ-ｚＡ-Ｚ]/.test(char)
          : /[a-zA-Z]/.test(char);
      case "symbols":
        // 記号は既存の実装で方向性が考慮されているのでそのまま
        return this.direction === "fullWidth"
          ? char in ConvertWidthStep.SYMBOL_MAP
          : char in ConvertWidthStep.REVERSE_SYMBOL_MAP;
      default:
        return false;
    }
  }

  /**
   * 一文字ずつの変換を行う
   * 対象文字種の場合は変換し、それ以外はそのまま返す
   */
  private convertChar(char: string): string {
    if (!this.isTargetCharacter(char)) {
      return char;
    }

    switch (this.target) {
      case "numbers":
      case "alphabet": {
        const offset = this.direction === "fullWidth" ? 0xfee0 : -0xfee0;
        return String.fromCharCode(char.charCodeAt(0) + offset);
      }
      case "symbols":
        return this.direction === "fullWidth"
          ? ConvertWidthStep.SYMBOL_MAP[char] || char
          : ConvertWidthStep.REVERSE_SYMBOL_MAP[char] || char;
      default:
        return char;
    }
  }

  toString(): string {
    return `ConvertWidthStep(target: ${this.target}, direction: ${this.direction})`;
  }
}
