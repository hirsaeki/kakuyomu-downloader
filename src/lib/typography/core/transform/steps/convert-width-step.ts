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
 * 半角/全角の相互変換を提供
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
    _: "＿",
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

  // 正規表現のキャッシュ
  private static readonly REGEX_CACHE = new Map<string, RegExp>();

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

  override isApplicable({ text }: TransformContext): boolean {
    if (!super.isApplicable({ text })) return false;

    try {
      // 対象の文字種が含まれているかチェック
      const hasTargetChars = this.hasTargetCharacters(text);

      widthLogger.debug("Checking applicability", {
        target: this.target,
        direction: this.direction,
        hasTargetChars,
        textLength: text.length,
      });

      return hasTargetChars;
    } catch (error) {
      widthLogger.error("Error in applicability check", {
        error: error instanceof Error ? error.message : "Unknown error",
        target: this.target,
      });
      return false;
    }
  }

  protected async processTransform({
    text,
  }: TransformContext): Promise<ProcessedText> {
    if (!this.isApplicable({ text })) {
      widthLogger.error("Invalid text content for width conversion", {
        target: this.target,
        direction: this.direction,
        textLength: text.length,
      });
      throw new TransformError("文字幅変換処理に失敗しました");
    }

    try {
      widthLogger.debug("Starting width conversion", {
        target: this.target,
        direction: this.direction,
        textLength: text.length,
        sampleText: text.slice(0, 100),
      });

      const converted = this.convertWidth(text);

      widthLogger.debug("Width conversion completed", {
        textLength: converted.length,
        sampleText: converted.slice(0, 100),
      });

      return this.createResult(converted);
    } catch (error) {
      widthLogger.error("Width conversion failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        target: this.target,
        direction: this.direction,
      });
      throw new TransformError("文字幅変換処理中にエラーが発生しました");
    }
  }

  private hasTargetCharacters(text: string): boolean {
    switch (this.target) {
      case "numbers":
        return /[0-9０-９]/.test(text);
      case "alphabet":
        return /[a-zA-Zａ-ｚＡ-Ｚ]/.test(text);
      case "symbols": {
        const symbols =
          this.direction === "fullwidth"
            ? Object.keys(ConvertWidthStep.SYMBOL_MAP)
            : Object.keys(ConvertWidthStep.REVERSE_SYMBOL_MAP);
        return symbols.some((s) => text.includes(s));
      }
      default:
        return false;
    }
  }

  private convertWidth(text: string): string {
    switch (this.target) {
      case "numbers":
      case "alphabet":
        return this.convertCharWidth(text);
      case "symbols":
        return this.direction === "fullwidth"
          ? this.toFullWidth(text)
          : this.toHalfWidth(text);
      default:
        return text;
    }
  }

  private convertCharWidth(text: string): string {
    const ranges = {
      numbers: ["0-9", "０-９"],
      alphabet: ["A-Za-z", "Ａ-Ｚａ-ｚ"],
    };

    const [halfRange, fullRange] = ranges[this.target];
    const pattern = this.getOrCreateRegExp(
      `[${this.direction === "fullwidth" ? halfRange : fullRange}]`
    );
    const offset = this.direction === "fullwidth" ? 0xfee0 : -0xfee0;

    widthLogger.debug("Converting character width", {
      target: this.target,
      direction: this.direction,
      textLength: text.length,
    });

    return text.replace(pattern, (char) =>
      String.fromCharCode(char.charCodeAt(0) + offset)
    );
  }

  private toFullWidth(text: string): string {
    widthLogger.debug("Converting to full width", {
      textLength: text.length,
    });

    let result = "";
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      result += ConvertWidthStep.SYMBOL_MAP[char] || char;
    }
    return result;
  }

  private toHalfWidth(text: string): string {
    widthLogger.debug("Converting to half width", {
      textLength: text.length,
    });

    let result = "";
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      result += ConvertWidthStep.REVERSE_SYMBOL_MAP[char] || char;
    }
    return result;
  }

  private getOrCreateRegExp(pattern: string): RegExp {
    const cacheKey = `${pattern}_g`;
    let regexp = ConvertWidthStep.REGEX_CACHE.get(cacheKey);

    if (!regexp) {
      regexp = new RegExp(pattern, "g");
      ConvertWidthStep.REGEX_CACHE.set(cacheKey, regexp);
    }

    regexp.lastIndex = 0; // リセット
    return regexp;
  }

  toString(): string {
    return `ConvertWidthStep(target: ${this.target}, direction: ${this.direction})`;
  }
}
