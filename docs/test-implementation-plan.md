# テスト実装計画書

## 1. テストの全体構造

テストファイルは`./test`以下に以下の構造で集約する：

```
test/
├── unit/                     # 単体テスト
│   ├── lib/                  # srcのlib以下に対応
│   │   ├── database/        
│   │   │   ├── __fixtures__/     # テストデータ
│   │   │   └── database.test.ts  # Dexie-memory使用
│   │   │
│   │   ├── epub/
│   │   │   ├── __fixtures__/     # EPUBのテストデータ
│   │   │   ├── generators/       # 生成関連のテスト
│   │   │   └── metadata.test.ts
│   │   │
│   │   ├── errors/              # エラー関連
│   │   │   ├── base.test.ts
│   │   │   └── database.test.ts
│   │   │
│   │   ├── http/
│   │   │   └── fetch-client.test.ts
│   │   │
│   │   ├── logger/             # ロガー関連
│   │   │   └── context-logger.test.ts
│   │   │
│   │   └── typography/         # テキスト処理
│   │       ├── __fixtures__/
│   │       ├── processor.test.ts
│   │       └── rules.test.ts
│   │
│   └── utils/                  # ユーティリティのテスト
│
├── integration/               # 結合テスト
│   ├── novel-download/        # 小説DL関連
│   │   ├── __fixtures__/
│   │   └── download-flow.test.ts
│   │
│   └── epub-generation/       # EPUB生成関連
│       ├── __fixtures__/
│       └── generation-flow.test.ts
│
├── e2e/                      # E2Eテスト
│   └── download-to-epub.test.ts
│
├── server/                   # サーバー関連
│   ├── __fixtures__/
│   ├── novel-controller.test.ts
│   └── server.test.ts
│
└── __helpers__/             # テスト用ヘルパー
    ├── setup.ts             # 共通セットアップ
    ├── mock-fetch.ts        # fetchのモック
    └── test-utils.ts        # 汎用ヘルパー
```

## 2. テスト実装の優先順位

1. データベース周り (unit/lib/database)
   - データの永続化とキャッシュの基盤となる部分
   - dexie-memory-addonを使用して実DBに近い形でテスト

2. 基本的なエラー処理 (unit/lib/errors)
   - アプリケーション全体のエラーハンドリングの基盤
   - 各種エラーケースの検証

3. サーバー周り (server/)
   - APIエンドポイントの動作検証
   - supertestを使用したHTTPリクエストのテスト

4. テキスト処理 (unit/lib/typography)
   - テキスト変換ルールの動作確認
   - 各種パターンの網羅的テスト

5. EPUB生成 (unit/lib/epub)
   - EPUBファイル生成ロジックの検証
   - メタデータ、コンテンツ生成の確認

## 3. テストツールと方針

### 使用ツール
- **Vitest**: テストランナー
- **dexie-memory-addon**: インメモリDB実装用
- **supertest**: HTTPテスト用
- **jsdom**: DOM環境のシミュレート用

### データベーステスト方針
- インメモリDBを使用して実際のDB操作に近い形でテスト
- トランザクション処理の挙動も含めて検証
- CRUD操作の網羅的なテストケース作成
- エラー時の挙動も確認

### サーバーテスト方針
- supertestを使用したAPIエンドポイントテスト
- fetchのモック化によるHTTPリクエストの制御
- タイムアウトなどのエラーケースの考慮
- リクエストバリデーションの確認

### 共通方針
- テストヘルパーの活用による重複コードの削減
- Fixturesの適切な配置と管理
- エラーケースを含む網羅的なテスト実装

## 4. Vitestの設定

```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/__helpers__/setup.ts'],
    include: [
      './test/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/vite-plugins/**',
      ]
    },
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
});
```

## 5. 必要な追加パッケージ

```json
{
  "devDependencies": {
    "dexie-memory-addon": "^1.0.0",
    "supertest": "^6.0.0",
    "@vitest/coverage-v8": "latest"
  }
}
```