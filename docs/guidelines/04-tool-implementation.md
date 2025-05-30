# Tool 実装ガイドライン

## はじめに

本ドキュメントは、GROWI MCP サーバーにおける `tool` の実装方法について、標準的なパターンとベストプラクティスを提供します。

## ディレクトリ構造

toolsは以下のような階層構造で実装します：

```
src/tools/
├── toolCategory/              # ツールのカテゴリ（例: page, user）
│   ├── index.ts              # カテゴリのエントリーポイント
│   └── toolName/             # 個別のツール実装
│       ├── index.ts          # ツールのエントリーポイント
│       ├── register.ts       # ツールの登録と実行制御
│       ├── schema.ts         # 入出力の型定義
│       └── service.ts        # ビジネスロジックの実装
```

## 各モジュールの責務

### `index.ts`

- エントリーポイントとして機能
- `register.ts` からの export を行う
- 必要最小限の実装とし、複雑なロジックは含めない

```typescript
export * from './register.js';
```

### `register.ts`

- ツールの登録処理を実装
- FastMCPへのツール登録
- パラメータのバリデーション
- エラーハンドリング
- `service.ts`の呼び出し

```typescript
export function registerSomeTool(server: FastMCP): void {
  server.addTool({
    name: 'toolName',
    description: 'Tool description',
    parameters: toolParamSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      title: 'Tool Title',
    },
    execute: async (params, context) => {
      // Implementation
    },
  });
}
```

### `schema.ts`

- 入力パラメータの型定義
- Zodを使用したバリデーションスキーマの定義
- TypeScriptの型エクスポート

```typescript
import { z } from 'zod';

export const toolParamSchema = z.object({
  param1: z.string().describe('Parameter description'),
  param2: z.number().optional().describe('Optional parameter'),
});

export type ToolParam = z.infer<typeof toolParamSchema>;
```

### `service.ts`

- ビジネスロジックの実装
- API クライアントの使用
- エラー変換処理

```typescript
import { apiV1 } from '../../../commons/api/client-v1';
import { GrowiApiError } from '../../../commons/api/growi-api-error';
import type { ToolParam } from './schema';

export const someOperation = async (params: ToolParam): Promise<Result> => {
  try {
    const response = await apiV1
      .post('endpoint', {
        json: params,
      })
      .json<ApiResponse>();

    return response.data;
  } catch (error) {
    // エラーハンドリング
  }
};
```

## API クライアントの使用

APIクライアントは以下の2種類が提供されています：

- `client-v1.ts`: GROWI API v1用のクライアント
- `client-v3.ts`: GROWI API v3用のクライアント

クライアントの使用例：

```typescript
import { apiV1 } from '../../../commons/api/client-v1';

// POSTリクエストの例
const response = await apiV1
  .post('endpoint', {
    json: requestBody,
  })
  .json<ResponseType>();

// GETリクエストの例
const response = await apiV1
  .get('endpoint', {
    searchParams: queryParams,
  })
  .json<ResponseType>();
```

## 命名規則

1. ファイル名
   - キャメルケース（例: `createPage`, `updateUser`）
   - 意味のある動詞＋名詞の組み合わせ

2. 関数名
   - キャメルケース
   - ツール登録関数: `register{ToolName}Tool`
   - サービス関数: 動詞＋名詞（例: `createPage`, `updateUser`）

3. 型名
   - パスカルケース
   - パラメータ型: `{ToolName}Param`
   - レスポンス型: `{ToolName}Response`

4. 変数名
   - キャメルケース
   - 意味のある名前を使用
   - 一時変数でも適切な名前を付ける

## テスト方針

1. テストファイルの配置
   ```
   src/tools/toolCategory/toolName/
   ├── __tests__/
   │   ├── register.test.ts    # 登録処理のテスト
   │   └── service.test.ts     # ビジネスロジックのテスト
   ```

2. テストの粒度
   - ユニットテスト
     - `schema.ts`: バリデーションの動作確認
     - `service.ts`: ビジネスロジックの動作確認
     - `register.ts`: ツール登録と実行フローの確認
   - 統合テスト
     - APIクライアントとの連携確認
     - エラーハンドリングの確認

3. モック化
   - APIレスポンスのモック
   - 外部依存のモック
   - エラーケースのシミュレーション

## エラーハンドリング

[`04-tool-error-handling.md`](04-tool-error-handling.md)のガイドラインに従い、以下の点に注意して実装します：

1. サービス層でのエラーハンドリング
   - APIエラーの適切な変換
   - ビジネスロジックエラーの処理
   - 予期せぬエラーの処理

2. ツール登録層でのエラーハンドリング
   - バリデーションエラーの処理
   - ユーザーフレンドリーなエラーメッセージ
   - デバッグ情報の付加

## 実装時の注意点

1. 型安全性
   - 適切な型定義の使用
   - `unknown`型の適切な絞り込み
   - 型ガード関数の活用

2. パフォーマンス
   - 不要なAPI呼び出しの削減
   - 適切なキャッシュの使用
   - 非同期処理の適切な制御

3. セキュリティ
   - 入力値の適切なバリデーション
   - 機密情報の適切な取り扱い
   - APIレスポンスの検証

4. メンテナンス性
   - 責務の明確な分離
   - 適切なコメントの記述
   - 再利用可能なコードの抽出