# Tools のエラーハンドリングの設計指針

## はじめに

本ドキュメントは、GROWI MCP サーバーにおける Tool 実装時の一貫したエラーハンドリングの実装指針を提供します。GROWI SDK（`@growi/sdk-typescript`）を活用したエラー処理の標準的なパターンを説明します。この指針は、人間の開発者とLLM（大規模言語モデル）の両方が理解しやすいように設計されています。

## エラーハンドリングの基本方針

### [重要] 言語
本ドキュメントには日本語で書かれており、サンプルとなるコード例中でも例えばコード内コメントや、エラーメッセージなどに日本語が使われているが、**実際の実装コードはこれらを全て英語で記述すること**。

### エラー処理の基本方針

1. エラー処理の階層と責務
   - ツール登録層（`register.ts`）：エラーの変換と最終的なユーザー向けエラーの生成
   - バリデーション層（`schema.ts`）：入力値の検証と型安全性の確保
   - SDK/API層：APIとの通信エラーの検出と伝播

2. エラータイプの使い分け
   - `GrowiApiError`：API通信やレスポース処理の内部エラー（内部用）
   - `UserError`：クライアント向けの最終的なエラー（外部用）
   - 詳細なエラー情報はdebugレベルでログ出力

3. コードの基本構造

```typescript
import { type FastMCP, UserError } from 'fastmcp';
import { ZodError } from 'zod';

export function registerSomeTool(server: FastMCP): void {
  server.addTool({
    execute: async (params, context) => {
      try {
        // バリデーションと実行
        const validatedParams = validateParams(params);
        const result = await executeOperation(validatedParams);
        return result;

      } catch (error) {
        // エラー処理の統一的なパターン
        handleToolError(error);
      }
    },
  });
}
```

4. バリデーション層（`schema.ts`）
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

3. SDK/API層の考慮事項
   - SDKが提供するエラー型を適切に活用する
   - エラーの型情報を失わないよう注意して伝播する
   - HTTPステータスとエラーレスポンスを確実に処理する

### エラー変換とメッセージング指針

1. エラーメッセージの構造化方針
   - 明確で具体的なメッセージを提供
   - エラーの種類に応じた追加情報を含める
   - デバッグに有用なコンテキストを付加
   - センシティブな情報は除外
   - エラー情報はdebugレベルでログ出力

2. 主要なエラー変換パターン
   ```typescript
   try {
     const validatedParams = createPageParamSchema.parse(params);
     const result = await apiv3.postPage(validatedParams);
     
     if (!result.data?.page) {
       throw new GrowiApiError('Invalid API response', 500);
     }
     
     return result;
     
   } catch (error) {
     // バリデーションエラー
     if (error instanceof ZodError) {
       throw new UserError('Invalid parameters', {
         validationErrors: error.errors,
       });
     }
     
     // APIエラー
     if ('isAxiosError' in error) {
       throw new UserError('Operation failed', {
         statusCode: error.response?.status,
         details: error.response?.data,
       });
     }
     
     // 予期せぬエラー
     throw new UserError('Unexpected error occurred', {
       originalError: error instanceof Error ? error.message : String(error),
     });
   }
   ```

```typescript
// エラー情報の構造化例

// 基本的なエラー
throw new UserError('Operation failed', {
  errorType: 'validation',
  details: 'Invalid input parameters',
});

// 追加情報を含むエラー
throw new UserError('Operation not permitted', {
  operation: 'createPage',
  reason: 'insufficient_permissions',
  requiredPermission: 'write',
});

// セキュリティを考慮したエラー
throw new UserError('Authentication failed', {
  reason: 'invalid_token',  // 機密情報やスタックトレースは含めない
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

## まとめ

このドキュメントで説明したエラーハンドリングのベストプラクティスをまとめると：

1. エラー処理の階層化
   - 各層（register.ts, schema.ts, SDK/API）で適切な役割分担
   - エラーの適切な変換と伝播

2. エラー情報の適切な構造化
   - 明確で具体的なメッセージ
   - 必要な追加情報の提供
   - センシティブ情報の除外

3. 堅牢な実装のために
   - 型安全性の確保
   - セキュリティ考慮事項の遵守
   - 適切なエラーログの記録

上記の各セクションに示したコード例を組み合わせることで、堅牢で保守性の高いエラーハンドリングが実現できます。