// サーバー側のネットワーク設定
export const SERVER_NETWORK_CONFIG = {
  ALLOWED_DOMAINS: ['kakuyomu.jp'] as const,
  TIMEOUTS: {
    REQUEST: 30000  // 30秒
  },
  USER_AGENT: 'Mozilla/5.0 (compatible; KakuyomuDownloader/1.0)',
  HTTP: {
    HEADERS: {
      ACCEPT: {
        HTML: 'text/html,application/xhtml+xml'
      },
      ACCEPT_LANGUAGE: 'ja,en-US;q=0.9,en;q=0.8'
    }
  }
} as const;