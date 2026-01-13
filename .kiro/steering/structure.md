# プロジェクト構造

## 組織方針

`src/`内でドメインファーストの組織化。ツールが主要ドメインであり、GROWIリソースタイプ（page、tag、revisionなど）ごとに整理。各ツールは関心の分離のため一貫したマルチファイルパターンに従う。

## ディレクトリパターン

### エントリーポイント
**場所**: `/src/index.ts`
**目的**: サーバー初期化、Axiosセットアップ、動的ローダーインポート
**パターン**: 最小限のブートストラップ、ドメインローダーに委譲

### ツール (`/src/tools/`)
**目的**: GROWIリソースタイプごとにグループ化されたMCPツール定義
**組織**: 各ツールタイプ（page、tagなど）は独自ディレクトリを持ち、個別ツールフォルダを含む

```
tools/
  page/           # ページ関連ツール
    searchPages/  # 個別ツール
    createPage/
    ...
  tag/            # タグ関連ツール
  revision/       # リビジョンツール
  comments/       # コメントツール
  shareLinks/     # 共有リンクツール
  user/           # ユーザーツール
  commons/        # 共有スキーマ（appNameSchema）
```

### ツールモジュールパターン
各ツールは一貫した3〜4ファイル構造に従う:
- `index.ts` - バレルパターンによる再エクスポート
- `schema.ts` - 説明付きZodパラメータスキーマ
- `register.ts` - 実行ハンドラーを持つFastMCPツール登録
- `service.ts` - （オプション）複雑な操作のビジネスロジック

### 設定 (`/src/config/`)
**目的**: 環境解析とアプリケーション設定
**ファイル**: `default.ts`（解析ロジック）、`types.ts`（インターフェース）

### 共通 (`/src/commons/`)
**目的**: ツール間で共有されるユーティリティ
**パターン**: 関心事ごとにグループ化（api/、utils/）

### プロンプト (`/src/prompts/`)
**目的**: MCPプロンプト定義
**パターン**: 登録関数を持つ個別プロンプトファイル

### リソース (`/src/resources/`)
**目的**: MCPリソース定義
**パターン**: ツールに対応したローダーパターン

## 命名規則

- **ディレクトリ**: ツールはcamelCase（`searchPages/`）、カテゴリはlowercase（`page/`）
- **ファイル**: 関数名に対応したcamelCase（`register.ts`、`schema.ts`）
- **関数**: `register{ToolName}Tool`、`load{Category}Tools`
- **スキーマ**: `{toolName}ParamSchema`
- **型**: PascalCase（`ValidatedParams`、`GrowiAppConfig`）

## インポート構成

```typescript
// 外部パッケージを先に
import { FastMCP, UserError } from 'fastmcp';
import { z } from 'zod';

// バージョン付きパスでSDKインポート
import apiv1 from '@growi/sdk-typescript/v1';
import apiv3 from '@growi/sdk-typescript/v3';

// 内部インポート（相対パス）
import { GrowiApiError } from '../../../commons/api/growi-api-error.js';
import { paramSchema } from './schema.js';
```

**注**: インポートには`.js`拡張子が必要（ES Moduleの解決方式）

## コード組織原則

- **バレルエクスポート**: 各ドメインディレクトリはローダーをエクスポートする`index.ts`を持つ
- **スキーマファースト**: Zodスキーマを定義し、`z.infer<T>`で型を導出
- **ローダーパターン**: `load{Category}Tools(server)`関数がすべてのツールを登録
- **エラーラッピング**: SDKエラーは`GrowiApiError`でラップし、MCP用に`UserError`に変換

---
_ファイルツリーではなくパターンを文書化する。パターンに従う新規ファイルは更新を必要としない_
