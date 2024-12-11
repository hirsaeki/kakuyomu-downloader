import { Plugin } from 'vite';
import * as yaml from 'js-yaml';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import type { PatternConfig } from '../types/patterns';
import { ValidationError, PatternError } from '../lib/errors';
import { createLogger } from '../lib/logger';

const patternLogger = createLogger('PatternManager');

export const DEFAULT_PATTERNS_DIR = 'src/lib/typography/config/patterns';

interface TransformerOptions {
  patternsDir?: string;
  ignoreErrors?: boolean;
  requiredPatterns?: string[];
}

function validatePatternConfig(config: unknown, file: string): PatternConfig {
  try {
    if (!config || typeof config !== 'object') {
      throw new ValidationError(`Invalid pattern configuration structure in ${file}`);
    }

    patternLogger.debug('Validating pattern config', { file });
    return config as PatternConfig;
  } catch (error) {
    patternLogger.warn(`Pattern validation failed: ${file}`, {
      error,
      config: JSON.stringify(config).slice(0, 100) + '...'
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
      patternLogger.info('Initializing pattern transformer', { 
        patternsDir: options.patternsDir,
        requiredPatterns: options.requiredPatterns 
      });

      projectRoot = config.root;
      patternsPath = options.patternsDir
        ? resolve(projectRoot, options.patternsDir)
        : join(projectRoot, DEFAULT_PATTERNS_DIR);

      if (!existsSync(patternsPath)) {
        const message = `Patterns directory not found: ${patternsPath}`;
        patternLogger.error(message);
        throw new PatternError(message);
      }

      if (options.requiredPatterns) {
        patternLogger.debug('Checking required patterns', { 
          patterns: options.requiredPatterns 
        });

        for (const pattern of options.requiredPatterns) {
          const patternPath = join(patternsPath, `${pattern}.yml`);
          if (!existsSync(patternPath)) {
            const message = `Required pattern file not found: ${pattern}.yml`;
            patternLogger.error(message, { pattern, path: patternPath });
            throw new PatternError(message, pattern);
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
        patternLogger.debug('Starting pattern load');
        const patterns: Record<string, PatternConfig> = {};
        const warnings: string[] = [];

        try {
          const files = readdirSync(patternsPath)
            .filter(file => file.endsWith('.yml'));

          patternLogger.info('Found pattern files', { count: files.length });

          if (files.length === 0) {
            const message = 'No YAML pattern files found in patterns directory';
            patternLogger.error(message);
            throw new PatternError(message);
          }

          for (const file of files) {
            const fullPath = join(patternsPath, file);
            const name = file.replace('.yml', '');

            try {
              patternLogger.debug('Processing pattern file', { file });
              
              const content = readFileSync(fullPath, 'utf-8');
              const parsed = yaml.load(content);

              if (!parsed || typeof parsed !== 'object') {
                throw new PatternError(`Invalid YAML structure in ${file}`, file);
              }

              const validatedConfig = validatePatternConfig(parsed, file);
              patterns[name] = validatedConfig;
              
              patternLogger.debug('Successfully loaded pattern', { 
                name,
                rulesCount: Object.keys(validatedConfig).length 
              });

            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';

              if (options.ignoreErrors) {
                patternLogger.warn('Skipping invalid pattern', {
                  file,
                  error: errorMessage
                });
                warnings.push(`Error in ${file}: ${errorMessage}`);
                continue;
              }

              patternLogger.error('Pattern processing failed', {
                file,
                error
              });

              if (error instanceof ValidationError) {
                throw error;
              }
              throw new PatternError(errorMessage, file);
            }
          }

          if (Object.keys(patterns).length === 0) {
            const message = 'No valid patterns were loaded';
            patternLogger.error(message);
            throw new PatternError(message);
          }

          const result = `import type { PatternConfig } from '@/lib/typography/core/transform/base/types';

// Pattern configurations loaded from ${patternsPath}
export const patterns: Record<string, PatternConfig> = ${
            JSON.stringify(patterns, null, 2)
          } as const;

${warnings.length > 0
  ? `// Warnings during pattern loading:\n${warnings.map(w => `// ${w}`).join('\n')}`
  : ''}`;

          patternLogger.info('Successfully loaded all patterns', {
            patternsCount: Object.keys(patterns).length,
            warningsCount: warnings.length
          });

          return result;

        } catch (error) {
          patternLogger.error('Failed to load patterns', {
            error,
            context: { patternsPath, options }
          });

          // エラー時は空のパターン定義を返す
          return `export const patterns = {} as const;`;
        }
      }
    },

    handleHotUpdate({ file, server }) {
      if (file.endsWith('.yml') && file.includes(patternsPath)) {
        patternLogger.info('Pattern file changed', { 
          file,
          operation: 'hot-update' 
        });
        
        const module = server.moduleGraph.getModuleById(resolvedVirtualModuleId);
        if (module) {
          patternLogger.debug('Reloading module', { moduleId: resolvedVirtualModuleId });
          server.reloadModule(module);
        }
        return [];
      }
    }
  };
}