# 共通モジュール実装ガイドライン

## はじめに

本ドキュメントは、GROWI MCP サーバーにおける`resource`と`tool`の実装で共通となるモジュール構造のベストプラクティスを提供します。

## GROWI SDKの活用

### 基本方針

1. SDKが提供する機能を最大限活用
    1. **どのSDKを利用して実装すべきなのか、必ず特定してからコードを書き始めること (予測で済ませないこと)**
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

## 推奨実装順序

1. [特定手順](../tips/sdk-method-discovery.md) に従い、利用する SDK のクラスや型、メソッドを特定する
    1. **特定が済んでいない、どのメソッドを使うか予測レベルでしか把握できていない場合は先に進まず、ユーザーに質問し確認すること**
2. はじめに schema.ts および register.ts から実装
    1. まずは regster.ts から SDK を直接利用する
3. service.ts 生成の検討、必要があれば実装
    1. カスタムロジックが必要なほど SDK 利用シーケンスが複雑である場合に限り、service.ts を生成してロジックをそちらへ移す
4. index.ts を実装
5. タスクリストの状態の更新
