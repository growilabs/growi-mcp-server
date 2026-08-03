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
- 一部機能については GROWI v7.2.5 系以上からでも利用可能
ｰ [GROWI API](https://docs.growi.org/en/api/)


## エージェントスキル

このリポジトリは [Agent Skills](https://skills.sh/) も提供しています。AI コーディングエージェントが GROWI とより効率的にやりとりするための再利用可能なワークフロー定義です。

### 利用可能なスキル

- **growi-mcp-setup** — GROWI MCP サーバーのセットアップを伴走します。スキルのインストール後、UTCP Code-Mode の設定から接続確認までをガイドします。
- **growi-smart-save** — コンテンツをGROWIにインテリジェントなパス提案付きで保存します。エージェントが `suggest-path` ツールを呼び出し、保存先の候補を提示し、ページ名と公開範囲の設定をガイドします。

## クイックスタート（推奨）

最短で GROWI を使い始める手順です。スキルをインストールすれば、その後のセットアップ（MCP サーバーの接続、UTCP Code-Mode の設定、疎通確認）は AI エージェントが伴走します。

### 1. スキルをインストール

お使いのエージェントに合わせてスキルをインストールします。

#### Claude Desktop (Cowork)

1. **カスタマイズ** > **個人用プラグイン**（+ アイコンをクリック）
2. **プラグインを参照** > **個人用**タブを選択
3. **ローカルアップロード**横の + アイコンをクリック
4. **GitHub からマーケットプレイスを追加**を選択
5. URL 欄にリポジトリ URL を入力して**同期**をクリック：

```
https://github.com/growilabs/growi-mcp-server
```

#### Claude Code

このリポジトリをプラグインマーケットプレイスとして追加し、プラグインをインストールします：

```
/plugin marketplace add growilabs/growi-mcp-server
/plugin install mcp-client-skills
```

#### Gemini CLI

Gemini CLI の Extension としてインストール（MCP ツールとスキルの両方が含まれます）：

```bash
gemini extensions install https://github.com/growilabs/growi-mcp-server
```

更新：

```bash
gemini extensions update growi-mcp-server
```

> [!IMPORTANT]
> v1.7.1 より前のリリースからインストールした拡張は MCP サーバーを起動できません（同梱のスキルだけが動き、GROWI ツールは使えません）。既存のインストールは自動では切り替わらないため、`gemini extensions update growi-mcp-server` を実行して修正を取り込んでください。

#### Skills.sh (Vercel)

Claude Code、Gemini CLI、Cursor、Codex、GitHub Copilot など[多数のエージェント](https://skills.sh/)で利用可能：

```bash
npx skills add growilabs/growi-mcp-server
```

更新：

```bash
npx skills update
```

#### 手動インストール

リポジトリからスキルを直接ダウンロードして、お使いのエージェントのスキルディレクトリに配置します：

1. このリポジトリの `skills/` から使いたいスキルのディレクトリをコピー
2. エージェントのスキルディレクトリに配置：
   - Claude Code: `.claude/skills/<skill-name>/SKILL.md`
   - Gemini CLI: `.gemini/skills/<skill-name>/SKILL.md`
   - その他のエージェント: `.agents/skills/<skill-name>/SKILL.md`

### 2. エージェントを再起動

インストール後、エージェントを再起動（またはリロード）して、スキルが認識されるようにします。

### 3. AI にセットアップを頼む

エージェントに「GROWI をセットアップして」と伝えると、`growi-mcp-setup` スキルが起動し、MCP サーバーの接続設定から疎通確認まで案内します。

> [!NOTE]
> スキルを使わず MCP サーバーを直接設定したい場合は、[MCPサーバーを直接使う](#mcpサーバーを直接使う) を参照してください。

## MCPサーバーを直接使う

スキルを使わず、MCP サーバーをエージェントに直接登録することもできます。最小構成で試したいときや、スキル経由のセットアップが使えないときのフォールバックとして利用してください。

複数のGROWIアプリへの同時接続をサポートしています。各アプリには番号付きの環境変数で設定を行います。

### 単一アプリの設定例
```json
{
  "mcpServers": {
    "growi": {
      "command": "npx",
      "args": ["-y", "@growi/mcp-server"],
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
      "args": ["-y", "@growi/mcp-server"],
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

> [!TIP]
> スキル経由のセットアップ（推奨）は [クイックスタート](#クイックスタート推奨) を参照してください。


## 利用可能なツール（機能）

### ページ管理
- `searchPages` - キーワードでページを検索
- `createPage` - 新しいページを作成
- `updatePage` - 既存ページを更新（本文全体を置換。新しいリビジョン ID を返却）
- `editPage` - 文字列置換でページの一部だけを編集（本文全体の送信が不要。dry-run での diff プレビュー対応）
- `deletePages` - ページを削除（一括対応）
- `duplicatePage` - ページを複製（子ページも含む）
- `renamePage` - ページ名とパスを変更
- `getPageOutline` - ページの見出しアウトラインを取得（本文なしで見出しツリー・行範囲・サイズを返却）。下線形式（setext）の見出しも検出する
- `getPageSection` - ページの一部だけを読み取り（見出しテキストまたは行範囲で指定）
- `getPageWholeContents` - ページの全文（markdown 本文）を取得
- `getPage` - **非推奨。2.0.0 で削除予定。** `getPageWholeContents` の別名として後方互換のために維持している。代わりに `getPageOutline` / `getPageSection` / `getPageWholeContents` のいずれかを使うこと
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
- `addComment` - ページにコメントを追加
- `removeComment` - ページのコメントを削除

### リビジョン管理
- `listRevisions` - ページの編集履歴を取得（リビジョン本文は省略され、代わりに bodyLength を返却）
- `getRevision` - 特定リビジョンの詳細
- `listRevisionChanges` - 認証ユーザー自身の連続編集（run）をページ横断で一覧取得（GROWI v7.5.6 以降が必要）
- `getRevisionDiffs` - リビジョンペア（最大 20 件）の unified diff を一括取得（GROWI v7.5.6 以降が必要）

### 共有リンク
- `createShareLink` - 共有リンクを作成
- `getShareLinks` - ページの共有リンク一覧
- `deleteShareLinks` - 共有リンクを削除
- `deleteShareLinkById` - 特定の共有リンクを削除

### ユーザー情報
- `getUserRecentPages` - 特定ユーザーの最近のページ


## Vault コマンド

本パッケージは MCP ツールの提供に加えて、GROWI Vault（wiki を読み取り専用の git エンドポイントとして公開したもの）のローカルクローンを扱うコマンドを備えています。エージェントが wiki をただのファイルとして検索できるようにするためのもので、`growi-smart-save` スキルが高精度な保存先探索で利用します。

```bash
# 初回はクローン、以降は更新し、クローンの場所を表示する
npx @growi/mcp-server vault-sync --app-name main [--dest <dir>] [--no-user]

# ネットワークに触らずクローンのディレクトリだけを表示する
npx @growi/mcp-server vault-path --app-name main

# ディスク上の Vault のファイル名を GROWI のページパスに戻す
npx @growi/mcp-server vault-decode '旧%3A old page.md'
```

対象インスタンスはアプリ名で指定し、その base URL と認証情報は MCP サーバーと同じ設定から解決されます（GROWI の前段がリバースプロキシの場合の `GROWI_HTTP_AUTH_*` も含む）。そのためトークンをコマンドラインに渡す必要はありません。`git` 2.31 以上が必要です（`--no-user` は 2.35 以上）。終了コードは `0` がクローン利用可、`1` が使い方または環境の問題、`2` が git の失敗またはクローンが使えない状態です。


## 設定オプション

### 環境変数

| 変数名 | 必須 | 説明 | デフォルト値 |
|--------|------|------|-------------|
| `GROWI_APP_NAME_{N}` | ✅ | GROWIアプリの識別名（N は整数値） | - |
| `GROWI_BASE_URL_{N}` | ✅ | GROWIインスタンスのベースURL（N は整数値） | - |
| `GROWI_API_TOKEN_{N}` | ✅ | GROWI APIアクセストークン（N は整数値） | - |
| `GROWI_HTTP_AUTH_USERNAME_{N}` | | GROWI 前段の HTTP 認証（Basic）のユーザー名（例: リバースプロキシ）。パスワードとセットで指定する。 | - |
| `GROWI_HTTP_AUTH_PASSWORD_{N}` | | GROWI 前段の HTTP 認証（Basic）のパスワード。ユーザー名とセットで指定する。 | - |
| `GROWI_DEFAULT_APP_NAME` | | デフォルトで使用するアプリ名 | 最初に設定されたアプリ |

### 複数アプリ設定の注意点
- 各アプリの設定には整数値（1, 2, 3...）を使用します (連番である必要はありません)
- `GROWI_APP_NAME_N`、`GROWI_BASE_URL_N`、`GROWI_API_TOKEN_N` の組み合わせが必要です
- アプリ名、ベースURL、APIトークンはそれぞれ一意である必要があります
- `GROWI_DEFAULT_APP_NAME` を省略した場合、最初に設定されたアプリがデフォルトになります
- `GROWI_DEFAULT_APP_NAME` に指定されたアプリは LLM に対して明示的にアプリ名をプロンプトに含めない場合にデフォルトで使用されるアプリとなります

### プロキシ配下の GROWI への HTTP 認証（Basic）
GROWI が HTTP 認証（例: リバースプロキシによる Basic 認証）の背後にある場合、そのアプリに対して `GROWI_HTTP_AUTH_USERNAME_{N}` と `GROWI_HTTP_AUTH_PASSWORD_{N}` の両方を設定します。指定するのはユーザー名とパスワードだけで、`Basic` の `Authorization` ヘッダーは自動で組み立てられます。

- 両方を設定するか、どちらも設定しないかのいずれかです。片方だけの設定は、分かりやすいエラーで即座に停止します。
- 設定すると、プロキシの資格情報が `Authorization` ヘッダーに入り、GROWI の API トークン（`GROWI_API_TOKEN_{N}`）は代わりに `X-GROWI-ACCESS-TOKEN` ヘッダーで送られます。未設定の場合は従来どおり `Bearer` トークン方式のままです。
- 現時点では Basic 認証のみ対応です（Digest 認証は将来対応予定）。変数名はスキームに依存しない形にしてあるため、Digest 対応時にもそのまま流用できます。


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

#### リリース手順

リリースは [Changesets](https://github.com/changesets/changesets) によって自動化されています。

1. **変更意図を記録する**: 利用者に影響する変更を含む PR では `pnpm changeset` を実行し、影響区分（patch / minor / major）と利用者向けの説明文を記録したうえで、生成された `.changeset/*.md` を PR に含めてください。内部的な変更のみ（リファクタリングやCIの調整など）のPRにはchangesetは不要です。
2. **リリースは2段階の流れで進みます**:
   - `main` へマージすると、未処理のchangesetを集約したRelease PRが自動で作成（または更新）されます。
   - そのRelease PRをマージすると、「npmへの公開 → `vX.Y.Z` 形式のtagのpush → GitHub Releaseの作成」がこの順番で自動で行われます。
   - バージョン番号は `package.json` を唯一の出所とし、`gemini-extension.json` と `.claude-plugin/plugin.json` のバージョンは版上げ時に自動で追従します。
   - Release PRをマージしてから公開が完了するまでの間（および、下記の通り公開が失敗して未解決のまま残っている間）は、`main` 上の `gemini-extension.json` がnpmにまだ存在しないバージョンを指す状態になります。通常のRelease経由のインストールではこの影響を受けませんが、ブランチを直接参照する使い方をしている場合は関係してきます。
3. **メンテナが一度だけ行う前提設定**（残っているのはnpm側の登録だけです）:
   - **npm側**: このパッケージに対して[Trusted Publisher](https://docs.npmjs.com/trusted-publishers)を登録してください。リポジトリ `growilabs/growi-mcp-server` とワークフローのファイル名 `release.yml` を指定します。この登録画面の各項目はすべて大文字小文字を区別し、ワークフローのファイル名は `.yml` の拡張子を含めて完全に一致させる必要があります。**登録画面にある「environment（環境名）」の欄は空のままにしてください** — このリリースワークフローは GitHub Actions の environment を宣言していないため、この欄に何か入力すると npm 側の身元照合が合わなくなり、公開が失敗します。この登録が漏れている、または誤っている場合は、黙って何も起きないのではなく、ワークフローの失敗として現れます。
   - **GitHubリポジトリ設定**: `Settings > Actions > General` の「**Allow GitHub Actions to create and approve pull requests**」は、このリポジトリで既に有効になっています（確認済み・対応不要）。（これが無効だとRelease PRを作成できません。）
4. **公開は成功したのにGitHub Releaseが作成されなかった場合**: ワークフローを再実行するだけでは復旧しません。`changeset publish` は「公開すべきものが既に無い」と判断し、Release作成をやり直さないためです。この場合は `gh release create vX.Y.Z` で該当バージョンのGitHub Releaseを手動作成してください。本文には `CHANGELOG.md` の該当節をそのまま使います。Gemini CLI 拡張はGitHub Release経由で配布されるため、この対応をしないと、npm側のパッケージ自体は無事公開されていても拡張の更新は利用者に届きません。

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
