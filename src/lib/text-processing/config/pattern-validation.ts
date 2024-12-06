import { PatternConfig, PatternDefinition, PatternRegExp, PatternValidationError } from '../types';

/**
 * 正規表現パターンの検証
 */
function validateRegExpPattern(pattern: PatternRegExp, patternName: string): void {
  if (!pattern.source || typeof pattern.source !== 'string') {
    throw new PatternValidationError(`Invalid regexp source in ${patternName}`, patternName);
  }

  // オプショナルフィールドの型チェック
  if (pattern.flags !== undefined && typeof pattern.flags !== 'string') {
    throw new PatternValidationError(`Invalid regexp flags in ${patternName}`, patternName);
  }
  if (pattern.lookbehind !== undefined && typeof pattern.lookbehind !== 'string') {
    throw new PatternValidationError(`Invalid lookbehind in ${patternName}`, patternName);
  }
  if (pattern.lookahead !== undefined && typeof pattern.lookahead !== 'string') {
    throw new PatternValidationError(`Invalid lookahead in ${patternName}`, patternName);
  }

  // 正規表現の構文チェック
  try {
    new RegExp(pattern.source, pattern.flags || 'g');
  } catch (e) {
    throw new PatternValidationError(
      `Invalid regexp in ${patternName}: ${e instanceof Error ? e.message : 'unknown error'}`,
      patternName
    );
  }
}

/**
 * パターン定義の検証
 */
export function validatePattern(pattern: unknown, filename: string): PatternDefinition {
  if (!pattern || typeof pattern !== 'object') {
    throw new PatternValidationError('Invalid pattern structure', filename);
  }

  const p = pattern as Record<string, unknown>;

  if (!p.name || typeof p.name !== 'string') {
    throw new PatternValidationError('Pattern name is required and must be a string', filename);
  }

  if (!p.pattern || typeof p.pattern !== 'object') {
    throw new PatternValidationError(`Pattern definition missing in ${p.name}`, filename);
  }

  // RegExpパターンの検証
  validateRegExpPattern(p.pattern as PatternRegExp, p.name);

  // 変換設定の検証
  if (!p.transform || typeof p.transform !== 'object') {
    throw new PatternValidationError(`Transform definition missing in ${p.name}`, filename);
  }

  if (!['text', 'tcy'].includes((p.transform as { type?: string }).type || '')) {
    throw new PatternValidationError(`Invalid transform type in ${p.name}`, filename);
  }

  return pattern as PatternDefinition;
}

/**
 * パターン設定全体の検証
 */
export function validatePatternConfig(config: unknown, filename: string): PatternConfig {
  if (!config || typeof config !== 'object') {
    throw new PatternValidationError('Invalid pattern config structure', filename);
  }

  const conf = config as Record<string, unknown>;

  if (typeof conf.basePriority !== 'number') {
    throw new PatternValidationError('basePriority must be a number', filename);
  }

  if (!Array.isArray(conf.patterns)) {
    throw new PatternValidationError('patterns must be an array', filename);
  }

  // 各パターンの検証
  const validatedPatterns = conf.patterns.map(p => validatePattern(p, filename));

  return {
    description: typeof conf.description === 'string' ? conf.description : undefined,
    basePriority: conf.basePriority as number,
    patterns: validatedPatterns,
    options: conf.options as PatternConfig['options']
  };
}
