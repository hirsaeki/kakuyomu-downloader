import { Plugin } from 'vite';
import * as yaml from 'js-yaml';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { ValidationError, PatternError } from '../lib/errors';
import { createLogger } from '../lib/logger';

const patternLogger = createLogger('PatternManager');

export const DEFAULT_PATTERNS_DIR = 'src/lib/typography/config/patterns';

interface TransformerOptions {
  patternsDir?: string;
  ignoreErrors?: boolean;
  requiredPatterns?: string[];
}

// パターン定義の型
interface PatternDefinition {
  name: string;
  description?: string;
  basePriority?: number;
  patterns: Array<{
    name: string;
    description?: string;
    pattern: {
      source: string;
      flags?: string;
      lookbehind?: string;
      lookahead?: string;
    };
    transform: {
      type: 'text' | 'tcy';
      steps: Array<{
        action: string;
        prefix?: string;
        suffix?: string;
        target?: string;
        direction?: string;
        from?: string;
        to?: string;
        group?: number;
        rules?: Array<{
          type: 'toKanji' | 'toFullwidth';
          params?: Record<string, unknown>;
        }>;
        separator?: string | string[];
        with?: string;
        template?: string;
      }>;
      ensureSpace?: {
        before?: boolean;
        after?: boolean;
      };
    };
    priority?: number;
  }>;
}

/**
 * パターン定義の検証
 */
function validatePattern(
  pattern: unknown, 
  file: string,
  parentPriority: number = 0
): PatternDefinition['patterns'][0] {
  try {
    const p = pattern as PatternDefinition['patterns'][0];

    // 必須フィールドの存在確認
    if (!p?.name || !p?.pattern?.source || !p?.transform?.steps) {
      throw new ValidationError(
        `Missing required fields in pattern: ${file}`
      );
    }

    // 各フィールドの型チェック
    if (typeof p.pattern.source !== 'string') {
      throw new ValidationError(
        `Invalid pattern source in: ${file}`
      );
    }

    // 正規表現の妥当性チェック
    try {
      new RegExp(p.pattern.source, p.pattern.flags);
    } catch (error) {
      throw new ValidationError(
        `Invalid regular expression in ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // transformステップの検証
    p.transform.steps.forEach((step, index) => {
      if (!step.action) {
        throw new ValidationError(
          `Missing action in transform step ${index} of ${file}`
        );
      }
    });

    // 優先度の計算
    p.priority = (p.priority ?? 0) + parentPriority;

    patternLogger.debug('Pattern validation passed', {
      name: p.name,
      file,
      priority: p.priority
    });

    return p;

  } catch (error) {
    patternLogger.error('Pattern validation failed', {
      file,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * YAMLファイルの読み込みと変換
 */
function loadYamlPatterns(filePath: string): PatternDefinition {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const parsed = yaml.load(content) as PatternDefinition;

    if (!parsed || typeof parsed !== 'object') {
      throw new ValidationError('Invalid YAML structure');
    }

    return parsed;
  } catch (error) {
    patternLogger.error('YAML loading failed', {
      file: filePath,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

export function yamlPatternTransformerPlugin(options: TransformerOptions = {}): Plugin {
  const virtualModuleId = 'virtual:pattern-config';
  const resolvedVirtualModuleId = '\0' + virtualModuleId;

  let projectRoot: string;
  let patternsPath: string;

  return {
    name: 'yaml-pattern-transformer',

    configResolved(config) {
      projectRoot = config.root;
      patternsPath = options.patternsDir
        ? resolve(projectRoot, options.patternsDir)
        : join(projectRoot, DEFAULT_PATTERNS_DIR);

      if (!existsSync(patternsPath)) {
        const message = `Patterns directory not found: ${patternsPath}`;
        patternLogger.error(message);
        throw new PatternError(message);
      }

      patternLogger.info('Pattern transformer initialized', {
        patternsDir: patternsPath
      });
    },

    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },

    async load(id) {
      if (id === resolvedVirtualModuleId) {
        const patterns: Record<string, PatternDefinition['patterns'][0]> = {};
        const warnings: string[] = [];

        try {
          const files = readdirSync(patternsPath)
            .filter(file => file.endsWith('.yml'));

          patternLogger.info('Found pattern files', { count: files.length });

          for (const file of files) {
            const fullPath = join(patternsPath, file);

            try {
              const yamlContent = loadYamlPatterns(fullPath);
              const basePriority = yamlContent.basePriority ?? 0;

              yamlContent.patterns.forEach(pattern => {
                const validatedPattern = validatePattern(
                  pattern,
                  file,
                  basePriority
                );
                patterns[validatedPattern.name] = validatedPattern;
              });

            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';

              if (options.ignoreErrors) {
                warnings.push(`Error in ${file}: ${errorMessage}`);
                continue;
              }

              throw new PatternError(errorMessage, file);
            }
          }

          // 型定義を含まないJavaScriptコードを生成
          const result = `
            export const patterns = ${JSON.stringify(patterns, null, 2)};
            
            ${warnings.length > 0
              ? `\n// Warnings during pattern loading:\n${warnings.map(w => `// ${w}`).join('\n')}`
              : ''}
          `.trim();

          patternLogger.info('Generated pattern module', {
            patternsCount: Object.keys(patterns).length,
            warningsCount: warnings.length
          });

          return result;

        } catch (error) {
          patternLogger.error('Pattern generation failed', {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          throw error;
        }
      }
    }
  };
}