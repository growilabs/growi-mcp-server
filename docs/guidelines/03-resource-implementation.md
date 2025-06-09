# リソース実装ガイドライン

本ドキュメントは、MCPサーバーにおけるリソース実装のガイドラインを提供します。

## ディレクトリ構造

リソースは以下のディレクトリ構造に従って実装します：

```
src/resources/
└── {resourceName}/
    ├── index.ts      # エクスポート定義
    ├── register.ts   # リソース登録
    └── service.ts    # ビジネスロジック
```

## 各モジュールの責務

### index.ts

- リソース登録関数のエクスポートのみを行う
- 命名規則：`register{ResourceName}Resource`

```typescript
export { register{ResourceName}Resource } from './register.js';
```

### register.ts

- FastMCPサーバーへのリソース登録を行う
- URIテンプレートの定義
- リソースの名前とMIMEタイプの定義
- パラメータの定義（必要な場合）
- `service.ts` で定義された関数の呼び出し
- エラーハンドリングとエラーメッセージの定義

主な実装パターン：

```typescript
export function register{ResourceName}Resource(server: FastMCP): void {
  server.addResource({
    uri: 'growi://{resource-name}/{identifier}',
    name: 'リソースの説明',
    mimeType: 'application/json',
    async load(params) {
      try {
        const result = await serviceFunction(params);
        return { text: JSON.stringify(result) };
      } catch (error) {
        console.error(`Error message:`, error);
        throw new Error('User-friendly error message');
      }
    },
  });
}
```

### service.ts

- ビジネスロジックの実装
- APIクライアントを使用したGROWI APIとの通信
- 型定義（パラメータと戻り値の型）
- 詳細なエラーハンドリング

## APIクライアントの利用

### クライアントの選択

- V1 API利用時: `import { apiV1 } from '../../commons/api/client-v1.js';`
- V3 API利用時: `import { apiV3 } from '../../commons/api/client-v3.js';`

### 使用パターン

```typescript
const response = await api{Version}
  .get('endpoint-name', {
    searchParams: {
      param: value,
    },
  })
  .json<ResponseType>();
```

## 命名規則

### ファイル名

- モジュールファイル: `index.ts`, `register.ts`, `service.ts`
- テストファイル: `{target}.spec.ts`

### 型定義

- パラメータ型: `{Method}Params`
  ```typescript
  type GetResourceParams = {
    id: string;
  };
  ```
- レスポンス型: `{Method}Response`
  ```typescript
  interface GetResourceResponse {
    data: ResourceData;
  }
  ```

### 関数名

- サービス関数: `{action}{Resource}` （例：`getPage`, `updateUser`）
- 登録関数: `register{Resource}Resource`

## エラーハンドリング

すべてのサービス関数は以下のエラーハンドリングパターンに従う：

```typescript
try {
  // API呼び出しと処理
} catch (error) {
  if (isGrowiApiError(error)) {
    throw error;
  }

  if (error instanceof Error) {
    // ky libraryのエラー処理
    if ('response' in error) {
      const response = (error as { response: Response }).response;
      throw new GrowiApiError(
        'エラーメッセージ',
        response.status,
        await response.json().catch(() => undefined)
      );
    }
  }

  throw new GrowiApiError('Unknown error occurred', 500, error);
}
```

## テスト

- テストファイルは実装ファイルと同じディレクトリに配置
- サービス関数のユニットテストを作成
- APIクライアントはモック化してテスト

テストファイルの例：
```typescript
import { describe, expect, it, vi } from 'vitest';
import { getResource } from './service';

describe('getResource', () => {
  it('should return resource data', async () => {
    // テストケースの実装
  });

  it('should handle errors properly', async () => {
    // エラーケースのテスト
  });
});
```

## その他の注意点

1. すべての外部通信は `service.ts` で行い、`register.ts` では純粋なリソース定義のみを行う
2. 型定義は可能な限り厳密に行い、`any` の使用は避ける
3. エラーメッセージは開発者とエンドユーザーの両方にとって理解しやすい表現を使用する
4. コメントは必要最小限とし、コードの意図が不明確な場合のみ追加する