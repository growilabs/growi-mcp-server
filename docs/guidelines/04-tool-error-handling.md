# Tools のエラーハンドリングの設計指針

## はじめに

本ドキュメントは、GROWI MCP サーバーにおける Tool 実装時の一貫したエラーハンドリングの実装指針を提供します。GROWI SDK（`@growi/sdk-typescript`）を活用したエラー処理の標準的なパターンを説明します。この指針は、人間の開発者とLLM（大規模言語モデル）の両方が理解しやすいように設計されています。

## エラーハンドリングの基本方針

### [重要] 言語
本ドキュメントには日本語で書かれており、サンプルとなるコード例中でも例えばコード内コメントや、エラーメッセージなどに日本語が使われているが、**実際の実装コードはこれらを全て英語で記述すること**。

### エラー処理の階層構造

1. ツール登録層（`register.ts`）
   - 各レイヤーのエラーをユーザーフレンドリーな形に変換
   - エラー種別に応じた適切な処理の振り分け
   - デバッグに有用な情報の付加

```typescript
import { type FastMCP, UserError } from 'fastmcp';
import { ZodError } from 'zod';
import apiv3 from '@growi/sdk-typescript/v3';
import { createPageParamSchema } from './schema';

export function registerSomeTool(server: FastMCP): void {
  server.addTool({
    // ... tool registration ...
    execute: async (params, context) => {
      try {
        // 1. バリデーション層のエラーハンドリング
        const validatedParams = createPageParamSchema.parse(params);

        // 2. SDK/API層の呼び出し
        const result = await apiv3.someMethod(validatedParams);
        return JSON.stringify(result);

      } catch (error) {
        // バリデーションエラーの処理
        if (error instanceof ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // APIエラーの処理
        if ('isAxiosError' in error) {
          const axiosError = error as AxiosError;
          throw new UserError(`Operation failed: ${axiosError.message}`, {
            statusCode: axiosError.response?.status,
            details: axiosError.response?.data,
          });
        }

        // 予期せぬエラーの処理
        throw new UserError('An unexpected error occurred', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
```

2. バリデーション層（`schema.ts`）
   - zodによる型安全なバリデーション
   - SDKの型定義との整合性確保
   - 入力値の検証と型付け

```typescript
import { z } from 'zod';
import type { PostPageBody } from '@growi/sdk-typescript/v3';

const postPageBodySchema = z.object({
  path: z.string().min(1, 'Page path is required'),
  body: z.string(),
  grant: z.number().min(0).max(5).optional(),
  grantUserGroupId: z.string().optional(),
  overwrite: z.boolean().optional(),
} satisfies { [K in keyof PostPageBody]: z.ZodType<PostPageBody[K]> });
```

3. SDK/API層
   - SDKが提供するエラー型の活用
   - axiosベースのエラー情報の取得
   - HTTPステータスとエラーレスポンスの処理

```typescript
try {
  const result = await apiv3.someMethod(params);
  return result;
} catch (error) {
  if ('isAxiosError' in error) {
    const axiosError = error as AxiosError;
    // エラー情報をregister層に伝播
    throw error;
  }
}
```

### UserErrorの使用方針

1. エラーメッセージの構造化
   - 明確で具体的なメッセージ
   - エラーの種類に応じた追加情報
   - デバッグに有用なコンテキスト

```typescript
// バリデーションエラー
throw new UserError('Invalid parameters provided', {
  validationErrors: zodError.errors,
  receivedInput: params,
});

// APIエラー
throw new UserError('Operation failed', {
  statusCode: error.response?.status,
  endpoint: error.config?.url,
  errorResponse: error.response?.data,
});

// ビジネスロジックエラー
throw new UserError('Operation not permitted', {
  operation: 'createPage',
  reason: 'insufficient_permissions',
  requiredPermission: 'write',
});
```

2. エラー情報のセキュリティ考慮事項
   - スタックトレースを含めない
   - 機密情報を露出させない
   - 必要最小限の情報提供

```typescript
// 良い例：必要な情報のみを含める
throw new UserError('Authentication failed', {
  reason: 'invalid_token',
});

// 悪い例：機密情報を含める
throw new UserError('Authentication failed', {
  token: 'actual-token-value', // 機密情報を含めない
  stackTrace: error.stack,     // スタックトレースを含めない
});
```

## セキュリティ考慮事項

### 入力バリデーション

- すべてのパラメータをスキーマに対して検証
- ファイルパスやシステムコマンドの安全性確保
- URLや外部識別子の検証
- パラメータのサイズと範囲のチェック
- コマンドインジェクションの防止

### エラー情報の適切な取り扱い

1. 内部エラーの詳細をクライアントに露出させない
2. セキュリティ関連のエラーを適切にログに記録
3. タイムアウトを適切に処理
4. エラー発生後のリソースクリーンアップを確実に実行
5. 返値の検証を行う

## 実装例

```typescript
import { UserError } from 'fastmcp';
import { z } from 'zod';
import type { AxiosError } from 'axios';
import apiv3 from '@growi/sdk-typescript/v3';
import type { PostPageBody } from '@growi/sdk-typescript/v3';

// パラメータスキーマの定義
const postPageBodySchema = z.object({
  path: z.string().min(1, 'Page path is required'),
  body: z.string(),
  grant: z.number().min(0).max(5).optional(),
  grantUserGroupId: z.string().optional(),
  overwrite: z.boolean().optional(),
} satisfies { [K in keyof PostPageBody]: z.ZodType<PostPageBody[K]> });

export function registerCreatePageTool(server: FastMCP): void {
  server.addTool({
    name: 'createPage',
    description: 'Create a new page in GROWI',
    parameters: postPageBodySchema,
    execute: async (params, context) => {
      try {
        // パラメータのバリデーション
        const validatedParams = postPageBodySchema.parse(params);

        // SDKを使用したページ作成
        const result = await apiv3.postPage(validatedParams);
        return JSON.stringify(result);

      } catch (error) {
        // バリデーションエラー
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // APIエラー
        if ('isAxiosError' in error) {
          const axiosError = error as AxiosError;
          throw new UserError(
            `Failed to create page: ${axiosError.message}`,
            {
              statusCode: axiosError.response?.status,
              details: axiosError.response?.data,
              path: params.path,
            }
          );
        }

        // 予期せぬエラー
        throw new UserError('An unexpected error occurred', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });
}
```

このコード例は以下の要素を示しています：

1. register.ts でのカスケード的なエラー処理
2. zodによる型安全なバリデーション
3. SDKを使用したAPI操作とエラーハンドリング
4. エラー情報の適切な変換と構造化
5. セキュリティを考慮したエラー情報の扱い