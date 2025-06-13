# リソース実装ガイドライン

本ドキュメントは、MCPサーバーにおけるリソース実装のガイドラインを提供します。

## はじめに

GROWI MCPサーバーのリソース実装では、`@growi/sdk-typescript`を直接利用することを推奨します。このアプローチにより：

- 型安全性の向上
- API仕様との一貫性維持
- コード量の削減
- メンテナンス性の向上

が期待できます。

## 共通構造について

リソースとツールで共通するモジュール構造（`index.ts`、`register.ts`の責務）とパラメータバリデーション（Zod）については、[**共通モジュール構造ガイドライン**](./05-common-module-structure.md)を参照してください。

## ディレクトリ構造

リソースは以下のディレクトリ構造に従って実装します：

```
src/resources/
└── {resourceName}/
    ├── index.ts      # エクスポート定義
    ├── register.ts   # リソース登録
    └── service.ts    # （オプション）SDKでカバーされない追加のビジネスロジック
```

`service.ts`は、SDKの機能で十分な場合は不要です。複雑なビジネスロジックや、複数のSDK関数を組み合わせる必要がある場合にのみ作成します。

## リソース固有の実装

### register.ts

- FastMCPサーバーへのリソース登録を行う
- URIテンプレートの定義
- リソースの名前とMIMEタイプの定義
- パラメータの定義（必要な場合）
- SDKの関数の直接呼び出し
- エラーハンドリングとエラーメッセージの定義

主な実装パターン：

```typescript
import apiv3 from '@growi/sdk-typescript/v3';

export function register{ResourceName}Resource(server: FastMCP): void {
  server.addResourceTemplate({
    uriTemplate: 'growi://{resource-name}/{identifier}',
    name: 'リソースの説明',
    mimeType: 'application/json',
    arguments: [
      {
        name: 'identifier',
        description: 'リソースを特定するための識別子',
        required: true,
      },
    ],
    async load({ identifier }) {
      try {
        const result = await apiv3.getSomeResource({ id: identifier });
        return { text: JSON.stringify(result) };
      } catch (error) {
        console.error(`Error message:`, error);
        throw new Error('User-friendly error message');
      }
    },
  });
}
```

### service.ts (オプション)

SDKの機能だけでは対応できない場合にのみ作成します：

- 複数のSDK関数を組み合わせた複雑なビジネスロジック
- キャッシュやデータ変換などの追加機能
- カスタムエラーハンドリング

## SDKの利用

### SDKのインポート

```typescript
// V3 APIの場合
import apiv3 from '@growi/sdk-typescript/v3';

// V1 APIの場合（非推奨）
import apiv1 from '@growi/sdk-typescript/v1';
```

### 基本的な使用パターン

```typescript
// ページ取得の例
const page = await apiv3.getPage({ path: '/some-path' });

// ユーザー情報取得の例
const user = await apiv3.getUser({ userId: 'user123' });
```

## エラーハンドリング

SDKから投げられるエラーは適切に型付けされているため、以下のようなパターンでハンドリングできます：

```typescript
try {
  const result = await apiv3.getSomeResource(params);
  return { text: JSON.stringify(result) };
} catch (error) {
  if (error instanceof apiv3.ApiError) {
    // APIエラーの詳細なハンドリング
    console.error(`API Error: ${error.status} - ${error.message}`);
    throw new Error(`Failed to get resource: ${error.message}`);
  }
  // その他の予期せぬエラー
  console.error('Unexpected error:', error);
  throw new Error('An unexpected error occurred');
}
```

## 命名規則

### ファイル名

- モジュールファイル: `index.ts`, `register.ts`, `service.ts`（必要な場合のみ）
- テストファイル: `{target}.spec.ts`

### 型定義

SDKが提供する型を積極的に活用します：

```typescript
import type { Page, User } from '@growi/sdk-typescript/v3';

// SDKの型を拡張する場合
interface ExtendedPageData extends Page {
  customField: string;
}
```

### 関数名

- 登録関数: `register{Resource}Resource`
- サービス関数（必要な場合）: `{action}{Resource}`

## テスト

### SDKのモック化

```typescript
import { vi, describe, it, expect } from 'vitest';
import apiv3 from '@growi/sdk-typescript/v3';

vi.mock('@growi/sdk-typescript/v3', () => ({
  default: {
    getPage: vi.fn().mockResolvedValue({ /* モックデータ */ }),
  },
}));

describe('pageResource', () => {
  it('should fetch page data', async () => {
    const result = await loadResource({ path: '/test' });
    expect(apiv3.getPage).toHaveBeenCalledWith({ path: '/test' });
    expect(result).toMatchSnapshot();
  });
});
```

## その他の注意点

1. SDKが提供する型を最大限活用し、型安全性を確保する
2. SDKのバージョンアップに注意を払い、Breaking Changesに対応する
3. エラーメッセージは開発者とエンドユーザーの両方にとって理解しやすい表現を使用する
4. 複雑なビジネスロジックが必要な場合のみ`service.ts`を作成し、それ以外はSDKを直接利用する