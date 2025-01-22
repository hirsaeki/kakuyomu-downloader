import { BaseTransformStep } from '../base/transform-step';
import type { TransformContext, ProcessedText } from '../types';
import { TransformError } from '@/lib/errors';
import { createContextLogger } from '@/lib/logger';

const replaceLogger = createContextLogger('replace-step');

/**
 * テキストの置換を行うステップ
 * structure.ymlやsymbol.ymlでの記号変換などに使用
 */
export class ReplaceStep extends BaseTransformStep {
  private readonly pattern: RegExp;
  private static readonly REGEX_CACHE = new Map<string, RegExp>();

  constructor(
    private readonly from: string,
    private readonly to: string,
    // 固定でgフラグを付けることで、複数箇所の置換を保証
    private readonly flags: string = 'g'
  ) {
    super();
    replaceLogger.debug('Initializing replace step', {
      from,
      to,
      flags
    });

    try {
      this.pattern = this.getOrCreateRegExp(from, flags);
    } catch (error) {
      const message = `Invalid regular expression: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      replaceLogger.error('Initialization failed', {
        error: message,
        from,
        flags
      });
      throw new TransformError(message);
    }
  }

  override isApplicable(context: TransformContext): boolean {
    if (!super.isApplicable(context)) return false;

    try {
      // パターンマッチの確認
      this.pattern.lastIndex = 0;  // resetが必要
      const hasMatch = this.pattern.test(context.text);

      replaceLogger.debug('Checking applicability', {
        from: this.from,
        hasMatch,
        textLength: context.text.length
      });

      return hasMatch;
    } catch (error) {
      replaceLogger.error('Error in pattern matching', {
        error: error instanceof Error ? error.message : 'Unknown error',
        from: this.from
      });
      return false;
    }
  }

  protected async processTransform(context: TransformContext): Promise<ProcessedText> {
    replaceLogger.debug('Starting text replacement', {
      textLength: context.text.length,
      from: this.from,
      to: this.to
    });

    try {
      // 置換前のパターンマッチ回数を取得（ロギング用）
      this.pattern.lastIndex = 0;
      const matches = context.text.match(this.pattern);
      const matchCount = matches?.length ?? 0;

      // 実際の置換処理
      this.pattern.lastIndex = 0;  // resetが必要
      const result = context.text.replace(this.pattern, this.to);

      replaceLogger.debug('Replacement completed', {
        matchCount,
        originalLength: context.text.length,
        resultLength: result.length,
        sampleResult: result.slice(0, 100)
      });

      return this.createResult(result);

    } catch (error) {
      const message = `Replace operation failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      replaceLogger.error('Replacement failed', {
        error: message,
        from: this.from,
        to: this.to,
        textLength: context.text.length
      });
      throw new TransformError(message);
    }
  }

  private getOrCreateRegExp(pattern: string, flags: string): RegExp {
    const cacheKey = `${pattern}_${flags}`;
    let regexp = ReplaceStep.REGEX_CACHE.get(cacheKey);

    if (!regexp) {
      replaceLogger.debug('Creating new RegExp', {
        pattern,
        flags
      });
      regexp = new RegExp(pattern, flags);
      ReplaceStep.REGEX_CACHE.set(cacheKey, regexp);
    }

    return regexp;
  }

  toString(): string {
    return `ReplaceStep(from: "${this.from}", to: "${this.to}", flags: "${this.flags}")`;
  }
}