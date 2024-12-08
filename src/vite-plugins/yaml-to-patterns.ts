import { Plugin } from 'vite';
import yaml from 'js-yaml';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import type { PatternConfig } from '@/lib/typography/core/transform/base/types';
import { ValidationError } from '@/types';
import { createContextLogger } from '@/lib/logger';

const patternLogger = createContextLogger('PatternManager');

// エラー型の定義
interface PatternLoadingError extends Error {
  file?: string;
  type: 'validation' | 'filesystem' | 'parse' | 'unknown';
}

/**
 * デフォルトのパターン定義ディレクトリ
 * プロジェクトルートからの相対パス
 */
export const DEFAULT_PATTERNS_DIR = 'src/lib/typography/config/patterns';

/**
 * プラグインの設定オプション
 */
interface TransformerOptions {
  /**
   * パターン定義ファイルのディレクトリパス
   * 未指定の場合はデフォルトのパターンディレクトリを使用
   */
  patternsDir?: string;

  /**
   * パターンのバリデーションエラーを無視するかどうか
   * true: エラーがあってもビルドを継続
   * false: エラー時にビルドを中断
   */
  ignoreErrors?: boolean;

  /**
   * 必須パターンファイルのリスト
   * これらのファイルが見つからない場合はエラーとする
   */
  requiredPatterns?: string[];
}

/**
 * パターンローディングエラーを作成する関数
 */
function createPatternLoadingError(
  message: string,
  type: PatternLoadingError['type'],
  file?: string
): PatternLoadingError {
  const error = new Error(message) as PatternLoadingError;
  error.type = type;
  if (file) error.file = file;
  return error;
}

/**
 * パターン定義の検証
 */
function validatePatternConfig(config: unknown, file: string): PatternConfig {
  if (!config || typeof config !== 'object') {
    throw new ValidationError(`Invalid pattern configuration in ${file}`);
  }

  // 実際のバリデーションロジックは後で実装
  // とりあえずanyで通す（YAGNIの原則！）
  return config as PatternConfig;
}

export function yamlPatternTransformerPlugin(options: TransformerOptions = {}): Plugin {
  const virtualModuleId = 'virtual:pattern-config';
  const resolvedVirtualModuleId = '\0' + virtualModuleId;

  // プロジェクトのルートパスを保持
  let projectRoot: string;
  // パターンディレクトリの絶対パスを保持
  let patternsPath: string;

  return {
    name: 'yaml-pattern-transformer',

    configResolved(config) {
      projectRoot = config.root;

      // パターンディレクトリの解決
      patternsPath = options.patternsDir
        ? resolve(projectRoot, options.patternsDir)
        : join(projectRoot, DEFAULT_PATTERNS_DIR);

      // パターンディレクトリの存在確認
      if (!existsSync(patternsPath)) {
        throw createPatternLoadingError(
          `Patterns directory not found: ${patternsPath}`,
          'filesystem'
        );
      }

      // 必須パターンファイルの存在確認
      if (options.requiredPatterns) {
        for (const pattern of options.requiredPatterns) {
          const patternPath = join(patternsPath, `${pattern}.yml`);
          if (!existsSync(patternPath)) {
            throw createPatternLoadingError(
              `Required pattern file not found: ${pattern}.yml`,
              'filesystem',
              pattern
            );
          }
        }
      }
    },

    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },

    async load(id) {
      if (id === resolvedVirtualModuleId) {
        const patterns: Record<string, PatternConfig> = {};
        const warnings: string[] = [];

        try {
          // パターンファイルの検索
          const files = readdirSync(patternsPath)
            .filter(file => file.endsWith('.yml'));

          if (files.length === 0) {
            throw createPatternLoadingError(
              'No YAML pattern files found in patterns directory',
              'filesystem'
            );
          }

          // 各パターンファイルの処理
          for (const file of files) {
            const fullPath = join(patternsPath, file);
            const name = file.replace('.yml', '');

            try {
              // ファイルの読み込みと解析
              const content = readFileSync(fullPath, 'utf-8');
              const parsed = yaml.load(content);

              if (!parsed || typeof parsed !== 'object') {
                throw createPatternLoadingError(
                  'Invalid YAML structure',
                  'parse',
                  file
                );
              }

              // パターン設定の検証
              const validatedConfig = validatePatternConfig(parsed, file);
              patterns[name] = validatedConfig;

            } catch (error) {
              const isValidationError = error instanceof ValidationError;
              const errorMessage = isValidationError
                ? error.message
                : error instanceof Error
                  ? error.message
                  : 'Unknown error';

              const formattedMessage = `Error in ${file}: ${errorMessage}`;

              if (options.ignoreErrors) {
                warnings.push(formattedMessage);
                continue;
              }

              throw createPatternLoadingError(
                formattedMessage,
                isValidationError ? 'validation' : 'parse',
                file
              );
            }
          }

          if (Object.keys(patterns).length === 0) {
            throw createPatternLoadingError(
              'No valid patterns were loaded',
              'validation'
            );
          }

          // 生成されるモジュールコード
          const result = `import type { PatternConfig } from '@/lib/typography/core/transform/base/types';

// Pattern configurations loaded from ${patternsPath}
export const patterns: Record<string, PatternConfig> = ${
            JSON.stringify(patterns, null, 2)
          } as const;

${warnings.length > 0
  ? `// Warnings during pattern loading:\n${warnings.map(w => `// ${w}`).join('\n')}`
  : ''}`;

          // eslintの警告を抑制するためのコメントを追加
          if (process.env.NODE_ENV === 'development') {
            // 開発環境でのみパターン読み込みログを出力
	    patternLogger.debug(`Pattern file changed: Loaded ${Object.keys(patterns).length} patterns`);
          }

          return result;

        } catch (error) {
          const message = error instanceof Error
            ? error.message
            : 'Unknown error in pattern loader';

          this.error(message);
          return `export const patterns = {} as const;`;
        }
      }
    },

    handleHotUpdate({ file, server }) {
      // パターンファイルの変更検知と再読み込み
      if (file.endsWith('.yml') && file.includes(patternsPath)) {
        if (process.env.NODE_ENV === 'development') {
          // 開発環境でのみファイル変更ログを出力
          patternLogger.debug(`Pattern file changed: ${file}`);
        }
        const module = server.moduleGraph.getModuleById(resolvedVirtualModuleId);
        if (module) {
          server.reloadModule(module);
        }
        return [];
      }
    }
  };
}
