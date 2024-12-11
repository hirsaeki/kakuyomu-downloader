/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import * as path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'test/**/*.{test,spec}.{ts,tsx}'
    ],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'],
      exclude: [
        'src/@types/**',
        'test/**',
        '**/*.d.ts',
        '**/types.ts',
        '**/*.config.{js,ts}'
      ]
    },
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.json'
    },
    pool: 'forks',
    maxConcurrency: 10,
    maxWorkers: 2,
    minWorkers: 1
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
