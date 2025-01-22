import tseslint from '@typescript-eslint/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier';
import tsParser from "@typescript-eslint/parser";
import eslint from '@eslint/js';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
// @ts-expect-error - eslint-plugin-react-hooks does not have types
import pluginReactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '.next/**',
      '.vscode/**',
      '.idea/**',
      '**/*.min.js',
      'src/components/ui/**',
      '**/generated/**',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ['./tsconfig.json', 'tsconfig.*.json'],
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      react: reactPlugin,
      'react-hooks':pluginReactHooks, 
    },
    rules: {
      ...eslintConfigPrettier.rules,
      ...tseslint.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,
      'no-console': ['error', { allow: ['warn', 'error', 'info', 'debug'] }],
    },
  },
  {
    files: ['**/tools/vite/**/*.ts', '**/tools/vite/**/*.mts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ['./tsconfig.json', 'tsconfig.*.json'],
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...eslintConfigPrettier.rules,
      ...tseslint.configs.recommended.rules,
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      ...eslint.configs.recommended.rules,
    },
  },
];