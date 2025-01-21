import { vi } from 'vitest';

// Loggerのモック設定
vi.mock('@/lib/logger', () => ({
  createContextLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}));

// DOMPurifyのモック設定（必要に応じて）
vi.mock('dompurify', () => ({
  default: {
    sanitize: (html: string) => html
  }
}));

// 他のグローバル設定や共通のモックがあれば追加
