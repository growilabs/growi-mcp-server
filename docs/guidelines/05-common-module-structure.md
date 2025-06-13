# 共通モジュール構造ガイドライン

## はじめに

本ドキュメントは、GROWI MCP サーバーにおける`resource`と`tool`の実装で共通となるモジュール構造のベストプラクティスを提供します。

## 各モジュールの責務

### `index.ts`

モジュールのエントリーポイントとして機能します。

**責務：**
- `register.ts`からのexportのみを行う
- 必要最小限の実装とし、複雑なロジックは含めない

**実装例：**
```typescript
export * from './register.js';
```

### `register.ts`

FastMCPサーバーへの登録処理を実装します。

**責務：**
- FastMCPサーバーへの登録
- パラメータのバリデーション
- SDKメソッドまたは`service.ts`の呼び出し
- エラーハンドリング

**基本構造：**
```typescript
import { FastMCP } from 'fastmcp';
import apiv3 from '@growi/sdk-typescript/v3';

export function register{ModuleName}(server: FastMCP): void {
  // 登録処理の実装
}
```

## パラメータバリデーション（Zod）

ツールにおけるパラメータバリデーションには、Zodライブラリを使用します。

### `schema.ts`

ツールの場合、入力パラメータの型定義とバリデーションスキーマを定義します。

**責務：**
- 入力パラメータの型定義
- Zodを使用したバリデーションスキーマの定義
- TypeScriptの型エクスポート

**基本的なスキーマ定義：**
```typescript
import { z } from 'zod';

export const paramSchema = z.object({
  // パラメータの定義
});

export type ParamType = z.infer<typeof paramSchema>;
```

### register.tsでのバリデーション

```typescript
execute: async (params, context) => {
  try {
    // zodによるパラメータバリデーション
    const validatedParams = paramSchema.parse(params);
    
    // バリデーション済みパラメータを使用
    const result = await apiv3.someMethod(validatedParams);
    
    return JSON.stringify(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new UserError(`Invalid parameters: ${error.message}`);
    }
    // その他のエラーハンドリング
  }
}
```

### スキーマ定義のベストプラクティス

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

// セキュリティを考慮したバリデーション
const securePathSchema = z.string()
  .min(1, 'Path is required')
  .regex(/^\//, 'Path must start with /')
  .refine(path => !path.includes('..'), 'Path traversal not allowed');
```
