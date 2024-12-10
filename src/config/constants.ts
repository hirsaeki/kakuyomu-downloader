/**
 * アプリケーション全体の設定定数
 */
import EPUB_CONFIG from './epub';

// ネットワーク関連の設定
export const NETWORK_CONFIG = {
  // リクエスト間隔(ms)
  REQUEST_INTERVAL: 2000,  // 2秒に変更

  // タイムアウト設定(ms)
  TIMEOUTS: {
    DEFAULT: 15000,     // 15秒に延長
    EPUB_GEN: 60000,    // 60秒に延長
    PATTERN: 10000,     // 10秒に延長
    REQUEST: 15000,     // 15秒に延長
  },

  // リトライ設定
  RETRY: {
    MAX_COUNT: 3,
    BASE_DELAY: 2000,
    MAX_DELAY: 30000
  },

  // HTTP設定
  HTTP: {
    HEADERS: {
      ACCEPT: {
        HTML: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        TEXT: 'text/plain',
        ALL: '*/*'
      },
      ACCEPT_LANGUAGE: 'ja,en-US;q=0.7,en;q=0.3'
    },
    STATUS: {
      OK: 200,
      BAD_REQUEST: 400,
      NOT_FOUND: 404,
      TIMEOUT: 408,
      TOO_MANY_REQUESTS: 429,
      SERVER_ERROR: 500
    }
  },

  // 許可されているドメイン
  ALLOWED_DOMAINS: ['kakuyomu.jp'] as const,

  // プロキシサーバー設定
  PROXY: {
    PORT: 3000,
    ENDPOINTS: {
      FETCH_CONTENT: '/api/fetch-content'
    }
  }
} as const;

// キャッシュ関連の設定
export const CACHE_CONFIG = {
  // 古いキャッシュの削除期間(日)
  MAX_AGE_DAYS: 30,

  // キャッシュ容量制限(MB)
  MAX_CACHE_SIZE: 100,

  // データベース設定
  DATABASE: {
    NAME: 'NovelDatabase',
    VERSION: 1,
    STORES: {
      WORKS: {
        NAME: 'works',
        KEY_PATH: 'url',
        INDEXES: ['workTitle', 'lastAccessed']
      },
      EPISODES: {
        NAME: 'episodes',
        KEY_PATH: '[workUrl+id]',
        INDEXES: ['workUrl', 'lastAccessed']
      },
      CONTENTS: {
        NAME: 'contents',
        KEY_PATH: 'episodeUrl',
        INDEXES: ['lastAccessed']
      }
    }
  },

  // クリーンアップ設定
  CLEANUP: {
    INTERVAL: 24 * 60 * 60 * 1000,  // 24時間
    BATCH_SIZE: 100
  }
} as const;

// テキスト処理関連の設定
export const TEXT_PROCESSING_CONFIG = {
  // 処理制限
  MAX_RECURSION_DEPTH: 10,
  MAX_PATTERN_ITERATIONS: 1000,

  // タイムアウト設定
  TIMEOUTS: {
    PATTERN: 10000     // 10秒に延長
  },

  // DOMPurify設定
  SANITIZER_CONFIG: {
    ALLOWED_TAGS: [
      'p',
      'br',
      'ruby',
      'rt',
      'rp',
      'span',
      'div',
      'h1'
    ] as string[],
    ALLOWED_ATTR: ['class'] as string[], 
    RETURN_DOM: false as const,
    WHOLE_DOCUMENT: false as const
  } as const,

  // 処理オプション
  PROCESSING_OPTIONS: {
    INDENT_SIZE: '1em',
    LINE_HEIGHT: 1.8,
    FONT_SIZE: '1em'
  }
} as const;

// アプリケーション全体の設定をエクスポート
export const APP_CONFIG = {
  NETWORK: NETWORK_CONFIG,
  CACHE: CACHE_CONFIG,
  TEXT_PROCESSING: TEXT_PROCESSING_CONFIG,
  EPUB: EPUB_CONFIG,

  // アプリケーション情報
  APP: {
    VERSION: '0.1.0',
    NAME: 'Web Novel Downloader',
    DESCRIPTION: 'Web小説を読みやすいEPUB形式でダウンロードするためのローカルツール'
  }
} as const;

// ロガーの設定
export const DEBUG_CONFIG = {
  FORCE_DEBUG_MODE: false,
  LOG_LEVEL: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
} as const;

// 基本的な型定義のエクスポート
export type NetworkConfig = typeof NETWORK_CONFIG;
export type CacheConfig = typeof CACHE_CONFIG;
export type TextProcessingConfig = typeof TEXT_PROCESSING_CONFIG;
export type AppConfig = typeof APP_CONFIG;