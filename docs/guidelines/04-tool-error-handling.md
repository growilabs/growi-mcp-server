# Tools のエラーハンドリングの設計指針

## はじめに

本ドキュメントは、GROWI MCP サーバーにおける Tool 実装時の一貫したエラーハンドリングの実装指針を提供します。この指針は、人間の開発者とLLM（大規模言語モデル）の両方が理解しやすいように設計されています。

## エラーハンドリングの基本方針

### [重要] 言語
本ドキュメントには日本語で書かれており、サンプルとなるコード例中でも例えばコード内コメントや、エラーメッセージなどに日本語が使われているが、**実際の実装コードはこれらを全て英語で記述すること**。


### サービス層（`service.ts`）

サービス層では、API呼び出しやビジネスロジックの実行時に発生したエラーを適切に捕捉し、明確な情報を含むエラーオブジェクトとしてスローします。

```typescript
try {
  const response = await apiClient.createPage(params);
  return response.data;
} catch (error) {
  // APIエラーの場合、GrowiApiErrorとしてスロー
  throw new GrowiApiError(
    'ページの作成に失敗しました',
    error.response?.status ?? 500,
    error.response?.data
  );
}
```

### ツール登録層（`register.ts`）

ツール登録層では、サービス層からスローされたエラーを適切にハンドリングし、ユーザーフレンドリーなエラーメッセージに変換します。

```typescript
try {
  const result = await service.someOperation(params);
  return JSON.stringify(result);
} catch (error) {
  if (isGrowiApiError(error)) {
    // ユーザーフレンドリーなエラーとして再スロー
    throw new UserError(
      `操作に失敗しました: ${error.message}`,
      {
        statusCode: error.statusCode,
        details: error.details
      }
    );
  }

  // 予期せぬエラーの場合
  throw new UserError('システムエラーが発生しました。管理者に連絡してください。');
}
```

## エラー種別ごとの対応

### `GrowiApiError`

[`GrowiApiError`](src/commons/api/growi-api-error.ts:1)は、GROWI APIとの通信時に発生するエラーを表現するカスタムエラークラスです。

```typescript
// エラー判定の例
if (isGrowiApiError(error)) {
  throw new UserError(`操作に失敗しました: ${error.message}`, {
    statusCode: error.statusCode,
    details: error.details
  });
}
```

### バリデーションエラー

パラメータのバリデーションには、[Zod](https://github.com/colinhacks/zod)を使用することを推奨します。Zodは以下の利点を提供します：

1. 型安全性の保証
2. 包括的なバリデーションルールの定義
3. 詳細なエラーメッセージの生成
4. スキーマ定義の再利用性

```typescript
// スキーマ定義の例（schema.ts）
import { z } from 'zod';

export const createPageParamSchema = z.object({
  path: z.string().min(1, 'Page path is required'),
  body: z.string(),
  grant: z.number().optional(),
  overwrite: z.boolean().optional(),
});

// バリデーションの例（register.ts）
try {
  const validatedParams = createPageParamSchema.parse(params);
  // 検証済みパラメータを使用して処理を続行
} catch (error) {
  if (error instanceof z.ZodError) {
    throw new UserError('Invalid parameters provided', {
      validationErrors: error.errors,
    });
  }
}
```

### その他のエラー

予期せぬエラーは、一般的なエラーメッセージと共に`UserError`としてスローします。

```typescript
throw new UserError(
  '操作を完了できませんでした。しばらく時間をおいて再度お試しください。'
);
```

## FastMCPにおけるエラーの扱い

### `UserError`の使用

[FastMCP](https://github.com/punkpeye/fastmcp)の`UserError`クラスは、ユーザーに表示することを意図したエラーを表現します。以下の原則に従って使用します：

1. ユーザーフレンドリーなメッセージを第一引数として渡す
2. デバッグに有用な情報を`extras`として第二引数に渡す

### `ContentResult`の使用

`ContentResult`の`isError: true`は原則として使用しません。ただし、以下の場合は例外とします：

- エラー情報自体がツールの主要な成果物である場合
  - 例：バリデーションツールが複数のエラー箇所をリストとして返す場合
  - 例：依存関係の解析ツールが競合を検出して報告する場合

## セキュリティ考慮事項

### 入力バリデーション

- すべてのパラメータをスキーマに対して検証
- ファイルパスやシステムコマンドの安全性確保
- URL や外部識別子の検証
- パラメータのサイズと範囲のチェック
- コマンドインジェクションの防止

### エラー情報の適切な取り扱い

1. 内部エラーの詳細をクライアントに露出させない
2. セキュリティ関連のエラーを適切にログに記録
3. タイムアウトを適切に処理
4. エラー発生後のリソースクリーンアップを確実に実行
5. 返値の検証を行う

## コード例

典型的なエラーハンドリングのパターンを示します：

```typescript
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { isGrowiApiError } from '../commons/api/growi-api-error.js';

// パラメータスキーマの定義
const someParamSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  value: z.number().min(0, 'Value must be non-negative'),
});

export function registerSomeTool(server: FastMCP): void {
  server.addTool({
    name: 'someTool',
    description: '何らかの操作を行うツール',
    parameters: someParamSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      title: '操作ツール'
    },
    execute: async (params, context) => {
      try {
        // zodによるパラメータバリデーション
        const validatedParams = someParamSchema.parse(params);

        // 検証済みパラメータを使用して操作を実行
        const result = await someService(validatedParams);
        return JSON.stringify(result);

      } catch (error) {
        // zodバリデーションエラーの処理
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // APIエラーの処理
        if (isGrowiApiError(error)) {
          throw new UserError(
            `Operation failed: ${error.message}`,
            {
              statusCode: error.statusCode,
              details: error.details
            }
          );
        }

        // その他の予期せぬエラーの処理
        throw new UserError('The operation could not be completed.');
      }
    }
  });
}
```

このコード例は以下の要素を示しています：

1. zodを使用したパラメータスキーマの定義
2. 型安全なバリデーションの実装
3. 様々なエラー種別（Zod、API、その他）に対する適切な処理
4. ユーザーフレンドリーなエラーメッセージの生成