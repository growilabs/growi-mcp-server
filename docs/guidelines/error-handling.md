# Tools のエラーハンドリングの設計指針

## はじめに

本ドキュメントは、GROWI MCP サーバーにおける Tool 実装時の一貫したエラーハンドリングの実装指針を提供します。この指針は、人間の開発者とLLM（大規模言語モデル）の両方が理解しやすいように設計されています。

## エラーハンドリングの基本方針

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

パラメータのバリデーションエラーは、具体的な問題点を示すメッセージと共に`UserError`としてスローします。

```typescript
if (!isValidPagePath(path)) {
  throw new UserError(
    'ページパスが不正です。使用できない文字が含まれているか、形式が間違っています。',
    { invalidPath: path }
  );
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
import { isGrowiApiError } from '../commons/api/growi-api-error.js';

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
        // パラメータのバリデーション
        if (!isValidParams(params)) {
          throw new UserError(
            '無効なパラメータが指定されました',
            { invalidParams: params }
          );
        }

        // 操作の実行
        const result = await someService(params);
        return JSON.stringify(result);

      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new UserError(
            `操作に失敗しました: ${error.message}`,
            {
              statusCode: error.statusCode,
              details: error.details
            }
          );
        }

        throw new UserError('操作を完了できませんでした。');
      }
    }
  });
}
```

このコード例は以下の要素を示しています：

1. 適切なツールアノテーションの設定
2. パラメータバリデーションの実装
3. 様々なエラー種別に対する適切な処理
4. ユーザーフレンドリーなエラーメッセージの生成