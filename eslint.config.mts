import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  // ベース設定
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
      // 生成ファイルを無視
      '**/generated/**',
    ],
  },

  // JavaScript/TypeScript共通のベースルール
  eslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2024,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    plugins: {
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      // 一般的なルール
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
      'no-alert': 'warn',

      // React関連
      'react/prop-types': 'off',
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // TypeScript特有の設定
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts'],
    rules: {
      // TypeScript特有のルール
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },

  // テストファイル用の設定
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', 'test/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // サーバーコード用の設定
  {
    files: ['server/**/*.{ts,tsx,mts}'],
    rules: {
      'no-console': 'off', // サーバーではconsole.logを許可
    },
  },

  // Viteプラグイン用の設定
  {
    files: ['src/vite-plugins/**/*.{ts,mts}'],
    rules: {
      'no-console': 'off', // ビルド時のログ出力を許可
    },
  },

  // Prettier連携
  eslintConfigPrettier,
);