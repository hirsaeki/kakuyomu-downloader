import { vi } from "vitest";

// Loggerのモック設定
// デバッグログを出力するかどうかを切り替える
const DEBUG_LOGGING = false;

vi.mock("@/lib/logger", () => ({
  createContextLogger: () => ({
    debug: DEBUG_LOGGING
      ? // eslint-disable-next-line no-console
        vi.fn((message, ...args) => console.log(`[DEBUG] ${message}`, ...args))
      : vi.fn(),
    info: DEBUG_LOGGING
      ? // eslint-disable-next-line no-console
        vi.fn((message, ...args) => console.log(`[INFO] ${message}`, ...args))
      : vi.fn(),
    warn: DEBUG_LOGGING
      ? vi.fn((message, ...args) => console.warn(`[WARN] ${message}`, ...args))
      : vi.fn(),
    error: DEBUG_LOGGING
      ? vi.fn((message, ...args) =>
          console.error(`[ERROR] ${message}`, ...args)
        )
      : vi.fn(),
  }),
}));

// DOMPurifyのモック設定（必要に応じて）
vi.mock("dompurify", () => ({
  default: {
    sanitize: (html: string) => html,
  },
}));

// 他のグローバル設定や共通のモックがあれば追加

// DOMParserのモック実装
// ブラウザ環境でのtextContent取得を単純化して模倣
global.DOMParser = class {
  parseFromString(html: string, _type: string) {
    return {
      body: {
        // シンプルなHTMLタグの除去とスペース・改行の保持
        textContent: html.replace(/<[^>]+>/g, '')
      }
    };
  }
} as any;
