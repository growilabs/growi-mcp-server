# Tool 実装ガイドライン

## はじめに

本ドキュメントは、GROWI MCP サーバーにおける `tool` の実装方法について、GROWI SDK（`@growi/sdk-typescript`）を活用した標準的なパターンとベストプラクティスを提供します。

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

## GROWI SDKの活用

### 基本方針

1. SDKが提供する機能を最大限活用
2. 直接的なAPIクライアントの使用を避ける
3. 型定義やバリデーションにSDKの定義を活用
4. カスタムロジックは必要な場合のみservice.tsに実装

### SDKの基本的な使用方法

```typescript
import apiv3 from '@growi/sdk-typescript/v3';
import type { Page, PageInfo } from '@growi/sdk-typescript/v3';

// 型安全な操作の例
const createPage = async (pageInfo: PageInfo): Promise<Page> => {
  try {
    const result = await apiv3.postPage({
      path: pageInfo.path,
      body: 'Page content',
      grant: 1,
    });
    
    if (!result.data?.page) {
      throw new Error('Invalid response: page data not found');
    }
    
    return result.data.page;
  } catch (error) {
    throw new Error(`Failed to create page: ${error}`);
  }
};
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
- SDKメソッドまたは`service.ts`（存在する場合）の呼び出し

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
      try {
        // zodによるパラメータバリデーション
        const validatedParams = toolParamSchema.parse(params);
        
        // SDKを使用した基本的な操作
        const result = await apiv3.someMethod(validatedParams);
        
        return JSON.stringify(result);
      } catch (error) {
        // エラーハンドリング（詳細は04-tool-error-handling.mdを参照）
        throw new UserError('Operation failed', { details: error });
      }
    },
  });
}
```

### `schema.ts`

- 入力パラメータの型定義
- Zodを使用したバリデーションスキーマの定義
- TypeScriptの型エクスポート
- SDKの型定義の活用

```typescript
import { z } from 'zod';
import type { PostPageBody } from '@growi/sdk-typescript/v3';

// SDKの型定義を活用したスキーマ例
const postPageBodySchema = z.object({
  path: z.string().min(1, 'Page path is required'),
  body: z.string(),
  grant: z.number().min(0).max(5).optional(),
  grantUserGroupId: z.string().optional(),
  overwrite: z.boolean().optional(),
} satisfies { [K in keyof PostPageBody]: z.ZodType<PostPageBody[K]> });

// 拡張したスキーマ
export const createPageParamSchema = postPageBodySchema.extend({
  // 追加のカスタムフィールド
  tags: z.array(z.string()).optional(),
  notification: z.boolean().optional(),
});

// SDKの型定義を継承した型
export type CreatePageParam = PostPageBody & z.infer<typeof createPageParamSchema>;
```

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

1. 型安全性

    ### スキーマ定義と型の整合性
    ```typescript
    // スキーマ定義時の型チェック
    const schema = z.object({...}) satisfies z.ZodType<SDKType>;

    // オプショナル属性の適切な定義
    const schema = z.object({
      required: z.string(),
      optional: z.string().optional(),
    });
    ```

    ### 型の拡張と検証
    ```typescript
    // 必要な場合のみ型の拡張
    type ExtendedType = SDKType & {
      additionalField?: string;
    };

    // レスポンスの型安全性
    const response: PostPage201 = await apiv3.postPage(params);
    if (!response.data?.page) {
      throw new GrowiApiError('Invalid response', 500);
    }
    ```

    ### 型安全性の確保のベストプラクティス
    - satisfies演算子の活用による型定義の厳密化
    - 明示的な型アノテーションの使用
    - コンパイラオプションの厳格化
    - nullやundefinedの適切な取り扱い

    ### データ処理時の注意点
    - 循環参照への対処
    - エンコード不可能な値の考慮

2. パフォーマンス
   - 不要なAPI呼び出しの削減
   - SDKのキャッシュ機能の活用（利用可能な場合）
   - 複数のAPI呼び出しを必要とする場合は適切な順序で実行

   ```typescript
   // 良い例：必要な情報のみを取得
   const pageInfo = await apiv3.getPageInfo({ path: '/path/to/page' });

   // 悪い例：必要以上の情報を取得
   const fullPage = await apiv3.getPage({ path: '/path/to/page', includeContent: true });
   ```

3. セキュリティ
   - 入力値の適切なバリデーション
   - 機密情報の適切な取り扱い
   - APIレスポンスの検証
   - ファイルパスやコマンドの安全性確保

   ```typescript
   // バリデーションの例
   const schema = z.object({
     path: z.string()
       .min(1, 'Path is required')
       .regex(/^\//, 'Path must start with /')
       .refine(path => !path.includes('..'), 'Path traversal is not allowed'),
     content: z.string(),
   });
   ```

4. メンテナンス性
    - SDKの型定義の変更に追従しやすい実装
    - 責務の明確な分離（SDKの利用とカスタムロジックの分離）
    - 適切なコメントの記述
    - 再利用可能なコードの抽出

5. エラーハンドリング
   - SDKのエラー型の適切な処理
   - ユーザーフレンドリーなエラーメッセージ
   - デバッグ情報の付加
   - 詳細は[`04-tool-error-handling.md`](04-tool-error-handling.md)を参照