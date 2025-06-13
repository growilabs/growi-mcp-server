# Tool 実装ガイドライン

## はじめに

本ドキュメントは、GROWI MCP サーバーにおける `tool` の実装方法について、GROWI SDK（`@growi/sdk-typescript`）を活用した標準的なパターンとベストプラクティスを提供します。

## 共通構造について

ツールとリソースで共通するモジュール構造（`index.ts`、`register.ts`の責務）とパラメータバリデーション（Zod）については、[**共通モジュール構造ガイドライン**](./031-common-module-structure.md)を参照してください。

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
│       └── service.ts        # (オプション) SDKでカバーされない追加のビジネスロジック
```

## ツール固有の実装

### `register.ts`

- ツールの登録処理を実装
- FastMCPへのツール登録
- パラメータのバリデーション
- エラーハンドリング
- SDKメソッドまたは`service.ts`（存在する場合）の呼び出し

主な実装パターン:

基本的な実装パターンは[**共通モジュール構造ガイドライン**](./031-common-module-structure.md)を参照してください。

```typescript
import { FastMCP, UserError } from 'fastmcp';
import apiv3 from '@growi/sdk-typescript/v3';
import { toolParamSchema } from './schema';

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
      // パラメータバリデーション・エラーハンドリングは共通文書参照
      const validatedParams = toolParamSchema.parse(params);
      
      // ツール固有のビジネスロジック
      const result = await apiv3.someMethod(validatedParams);
      
      return JSON.stringify(result);
    },
  });
}
```

### Annotations設定

ツールの特性を表すannotationsを適切に設定します：

```typescript
annotations: {
  readOnlyHint: false,           // 読み取り専用かどうか
  destructiveHint: true,         // 破壊的操作かどうか（削除など）
  idempotentHint: false,         // 冪等性があるかどうか
  openWorldHint: true,           // オープンワールド仮定
  title: 'Tool Title',           // ツールのタイトル
},
```

**各annotationの使い方：**
- `readOnlyHint`: データを変更しない読み取り専用操作では`true`
- `destructiveHint`: 削除やデータ破壊の可能性がある操作では`true`
- `idempotentHint`: 同じ操作を複数回実行しても結果が変わらない場合は`true`
- `openWorldHint`: 通常は`true`、制限された環境でのみ`false`

### `schema.ts` の実装

詳細な実装方法については[**共通モジュール構造ガイドライン**](./031-common-module-structure.md)を参照してください。

ツール固有の考慮事項：
- annotations設定に応じた適切なバリデーション
- ツールの性質（読み取り専用、破壊的操作など）に応じたパラメータ制限

### `service.ts` (オプショナル)

- SDKでカバーされない追加のビジネスロジックのみを実装
- 複数のSDK操作の組み合わせや拡張が必要な場合に使用
- 基本的なCRUD操作はSDKを直接使用し、service.tsは作成しない

```typescript
import apiv3 from '@growi/sdk-typescript/v3';
import type { Page, PageInfo } from '@growi/sdk-typescript/v3';
import type { CreatePageParam } from './schema';

// 例: SDKの機能を拡張した独自のビジネスロジック
export const createPageWithMetadata = async (params: CreatePageParam): Promise<Page> => {
  // SDKの基本機能を利用
  const result = await apiv3.postPage({
    path: params.path,
    body: params.body,
    grant: params.grant,
  });
  
  // 追加のビジネスロジック（メタデータの付与など）
  const enhancedPage = await addMetadata(result.data);
  return enhancedPage;
};
```

## テスト方針

1. テストファイルの配置
   ```
   src/tools/toolCategory/toolName/
   ├── __tests__/
   │   ├── register.test.ts    # ツール登録と実行フローのテスト
   │   └── service.test.ts     # 追加ビジネスロジックのテスト（存在する場合）
   ```

2. テストの粒度
   - ユニットテスト
     - `schema.ts`: バリデーションの動作確認
     - `service.ts`: 追加ビジネスロジックの動作確認（存在する場合）
     - `register.ts`: ツール登録と実行フローの確認
   - 統合テスト
     - SDKメソッドの呼び出しの確認
     - エラーハンドリングの確認

3. モック化
    ```typescript
    // SDKメソッドのモック
    jest.mock('@growi/sdk-typescript/v3', () => ({
      postPage: jest.fn().mockResolvedValue({
        data: { page: { _id: '123', path: '/test' } }
      }),
    }));
    ```

## 実装時の注意点

型安全性やスキーマ定義については[**共通モジュール構造ガイドライン**](./031-common-module-structure.md)を参照してください。

1. パフォーマンス
   - 不要なAPI呼び出しの削減
   - SDKのキャッシュ機能の活用（利用可能な場合）
   - 複数のAPI呼び出しを必要とする場合は適切な順序で実行

   ```typescript
   // 良い例：必要な情報のみを取得
   const pageInfo = await apiv3.getPageInfo({ path: '/path/to/page' });

   // 悪い例：必要以上の情報を取得
   const fullPage = await apiv3.getPage({ path: '/path/to/page', includeContent: true });
   ```

2. セキュリティ
   - ツール実行時の権限チェック
   - 破壊的操作に対する追加確認
   - ツール固有のセキュリティ要件の実装

3. メンテナンス性
    - ツール間の依存関係の管理
    - ツールのバージョニング戦略
    - annotations設定の一貫性維持

4. エラーハンドリング
   - ツール実行エラーの適切な分類
   - ユーザーに対するツール固有のエラーメッセージ
   - 詳細は[`035-tool-error-handling.md`](./035-tool-error-handling.md)を参照