- [English 🇺🇸](./README.md)

# @growi/mcp-server

[![npm version](https://badge.fury.io/js/%40growi%2Fmcp-server.svg)](https://badge.fury.io/js/%40growi%2Fmcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

GROWI wiki コンテンツにAIモデルを接続するModel Context Protocol (MCP) サーバーです。組織のナレッジベースから情報を検索・取得し、正確でコンテキストに配慮したレスポンスをLLMが提供できるようにします。複数のGROWIアプリへの接続をサポートしています。

## 主な機能

- 🔍 **GROWI ページの検索と取得**
- 📝 **ページの管理**
- 🏷️ **タグ管理**
- 📋 **コメント管理**
- 🔗 **共有リンク管理**

## サポートするGROWIバージョン

- GROWI v7.3.x 以上を推奨
    - ※GROWI v7.3.x は 2025Q2 にリリース予定
- 一部機能については GROWI v7.2 系以下でも利用可能
ｰ [GROWI API](https://docs.growi.org/en/api/)


## MCPサーバーの設定

複数のGROWIアプリへの同時接続をサポートしています。各アプリには番号付きの環境変数で設定を行います。

### 単一アプリの設定例
```json
{
  "mcpServers": {
    "growi": {
      "command": "npx",
      "args": ["@growi/mcp-server"],
      "env": {
        "GROWI_APP_NAME_1": "main",
        "GROWI_BASE_URL_1": "https://your-growi-instance.com",
        "GROWI_API_TOKEN_1": "your_growi_api_token"
      }
    }
  }
}
```

### 複数アプリの設定例
```json
{
  "mcpServers": {
    "growi": {
      "command": "npx",
      "args": ["@growi/mcp-server"],
      "env": {
        "GROWI_DEFAULT_APP_NAME": "staging",

        "GROWI_APP_NAME_1": "production",
        "GROWI_BASE_URL_1": "https://wiki.example.com",
        "GROWI_API_TOKEN_1": "token_for_production",

        "GROWI_APP_NAME_2": "staging",
        "GROWI_BASE_URL_2": "https://wiki-staging.example.com",
        "GROWI_API_TOKEN_2": "token_for_staging",
        
        "GROWI_APP_NAME_3": "development",
        "GROWI_BASE_URL_3": "https://wiki-dev.example.com",
        "GROWI_API_TOKEN_3": "token_for_development"
      }
    }
  }
}
```

## 利用可能なツール（機能）

### ページ管理
- `searchPages` - キーワードでページを検索
- `createPage` - 新しいページを作成
- `updatePage` - 既存ページを更新
- `deletePages` - ページを削除（一括対応）
- `duplicatePage` - ページを複製（子ページも含む）
- `renamePage` - ページ名とパスを変更
- `getPage` - ページの内容を取得
- `getPageInfo` - ページの詳細情報を取得
- `getRecentPages` - 最近更新されたページ一覧
- `getPageListingRoot` - ルートページ一覧を取得
- `getPageListingChildren` - 指定ページの子ページ一覧
- `pageListingInfo` - ページ一覧の要約情報
- `publishPage` / `unpublishPage` - ページの公開・非公開設定

### タグ管理
- `getPageTag` - ページのタグを取得
- `updateTag` - ページのタグを更新
- `getTagList` - タグ一覧を取得
- `searchTags` - タグを検索

### コメント・ディスカッション
- `getComments` - ページのコメントを取得

### リビジョン管理
- `listRevisions` - ページの編集履歴を取得
- `getRevision` - 特定リビジョンの詳細

### 共有リンク
- `createShareLink` - 共有リンクを作成
- `getShareLinks` - ページの共有リンク一覧
- `deleteShareLinks` - 共有リンクを削除
- `deleteShareLinkById` - 特定の共有リンクを削除

### ユーザー情報
- `getUserRecentPages` - 特定ユーザーの最近のページ


## 設定オプション

### 環境変数

| 変数名 | 必須 | 説明 | デフォルト値 |
|--------|------|------|-------------|
| `GROWI_APP_NAME_{N}` | ✅ | GROWIアプリの識別名（N は整数値） | - |
| `GROWI_BASE_URL_{N}` | ✅ | GROWIインスタンスのベースURL（N は整数値） | - |
| `GROWI_API_TOKEN_{N}` | ✅ | GROWI APIアクセストークン（N は整数値） | - |
| `GROWI_DEFAULT_APP_NAME` | ❌ | デフォルトで使用するアプリ名 | 最初に設定されたアプリ |

### 複数アプリ設定の注意点
- 各アプリの設定には整数値（1, 2, 3...）を使用します (連番である必要はありません)
- `GROWI_APP_NAME_N`、`GROWI_BASE_URL_N`、`GROWI_API_TOKEN_N` の組み合わせが必要です
- アプリ名、ベースURL、APIトークンはそれぞれ一意である必要があります
- `GROWI_DEFAULT_APP_NAME` を省略した場合、最初に設定されたアプリがデフォルトになります
- `GROWI_DEFAULT_APP_NAME` に指定されたアプリは LLM に対して明示的にアプリ名をプロンプトに含めない場合にデフォルトで使用されるアプリとなります


## 開発者向け情報

### 必要な環境
- Node.js 18以上
- pnpm（推奨）
- GROWIインスタンス（開発・テスト用）

### スタートアップ

1. リポジトリをクローン
```bash
git clone https://github.com/growilabs/growi-mcp-server.git
cd growi-mcp-server
```

2. 依存関係をインストール
```bash
pnpm install
```

3. 環境変数を設定
```bash
cp .env.example .env.local
# .env.local を編集してGROWI接続情報を入力
```

4. 開発サーバーを起動
```bash
# MCP CLIで動作確認
pnpm dev:cli

# MCP Inspectorで開発
pnpm dev:inspect
```

### ビルドとテスト
```bash
# ビルド
pnpm build

# リント
pnpm lint

# テスト
pnpm test

# テストカバレッジ
pnpm test:coverage

# 本番環境での実行
pnpm start
```

### MCPサーバーの設定

1. ビルド
```bash
pnpm build
```

2. MCPサーバー設定（単一アプリの場合）
```json
{
  "mcpServers": {
    "growi": {
      "command": "node",
      "args": ["/Users/username/projects/growi-mcp-server/dist/index.js"],
      "env": {
        "GROWI_APP_NAME_1": "main",
        "GROWI_BASE_URL_1": "https://your-growi-instance.com",
        "GROWI_API_TOKEN_1": "your_growi_api_token"
      }
    }
  }
}
```

3. MCPサーバー設定（複数アプリの場合）
```json
{
  "mcpServers": {
    "growi": {
      "command": "node",
      "args": ["/Users/username/projects/growi-mcp-server/dist/index.js"],
      "env": {
        "GROWI_DEFAULT_APP_NAME": "production",

        "GROWI_APP_NAME_1": "production",
        "GROWI_BASE_URL_1": "https://wiki.example.com",
        "GROWI_API_TOKEN_1": "production_token",

        "GROWI_APP_NAME_2": "staging",
        "GROWI_BASE_URL_2": "https://wiki-staging.example.com",
        "GROWI_API_TOKEN_2": "staging_token"
      }
    }
  }
}
```

> [!NOTE]
> "args" にはビルドで生成された成果物への絶対パスを指定してください

### トラブルシュート

### GROWIに接続できない場合
1. 接続性を確認
    ```bash
    curl -v http://app:3000/_api/v3/healthcheck
    ```
2. `app` ホスト名が解決できない場合は、devcontainerネットワークを確認し、`growi_devcontainer_default`が含まれていることを確認
    - `.devcontainer/devcontainer.json` ファイルで `runArgs` に `--network` が設定されているため、コンテナを再ビルドすることでこの設定が適用されます
    - 手動で追加する場合は、以下を実行：
        - Dockerホストマシンで `docker network` コマンドを実行
        ```bash
        docker network connect growi_devcontainer_default growi-mcp-server-dev
        ```


### コントリビューション

プロジェクトへの貢献を歓迎します！

#### 貢献方法
1. **Issue報告**: バグ報告や機能要求は[GitHub Issues](https://github.com/growilabs/growi-mcp-server/issues)で
2. **プルリクエスト**:
   - フォークしてブランチを作成
   - 変更を実装
   - テストを追加（該当する場合）
   - プルリクエストを作成

#### 開発ガイドライン
- **コーディング規約**: [Biome](https://biomejs.dev/)を使用
- **コミットメッセージ**: [Conventional Commits](https://www.conventionalcommits.org/)に従う

## ライセンス

このプロジェクトは[MITライセンス](./LICENSE)の下で公開されています。

---

## 関連リンク

- **[GROWI公式サイト](https://growi.org/)** - オープンソースWikiプラットフォーム
- **[Model Context Protocol](https://modelcontextprotocol.io/)** - AIとツール統合の標準プロトコル
- **[GROWI SDK TypeScript](https://github.com/growilabs/growi-sdk-typescript)** - GROWI API TypeScript SDK
- **[FastMCP](https://github.com/punkpeye/fastmcp)** - MCPサーバー開発フレームワーク

---

**注意事項**

このMCPサーバーは開発中です。APIは予告なく変更される可能性があります。本番環境で使用する前に十分にテストを行ってください。
