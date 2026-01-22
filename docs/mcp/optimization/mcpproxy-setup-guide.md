# MCPProxy 導入ガイド

GROWI MCP Server を MCPProxy 経由で利用するためのセットアップ手順。

---

## 概要

MCPProxy は複数の MCP サーバーを統合し、コード実行機能（`code_execution`）を提供するプロキシサーバー。
GROWI MCP Server と組み合わせることで、トークン消費を大幅に削減できる。

### 構成図

```
Claude Desktop / Claude Code
    ↓ (mcp-remote)
MCPProxy (:8080)
    ↓ (stdio)
GROWI MCP Server
    ↓ (REST API)
GROWI
```

---

## 前提条件

- Node.js がインストールされていること
- GROWI が起動していること（例: `http://localhost:3000/`）
- GROWI の API トークンを取得済みであること

---

## 手順

### 1. MCPProxy のインストール

#### Windows

[GitHub Releases](https://github.com/smart-mcp-proxy/mcpproxy-go/releases) から最新のインストーラーをダウンロード：

- **x64**: `mcpproxy-setup-*-amd64.exe`
- **ARM64**: `mcpproxy-setup-*-arm64.exe`

インストーラーを実行すると、以下が自動設定される：
- `C:\Program Files\MCPProxy\` にインストール
- PATH 環境変数に追加
- スタートメニューに登録

> **注意**: PATH の反映には Windows の再起動（またはサインアウト→サインイン）が必要な場合がある

#### macOS

```bash
# Homebrew
brew install smart-mcp-proxy/mcpproxy/mcpproxy

# または DMG インストーラーをダウンロード
```

#### Go で直接インストール

```bash
go install github.com/smart-mcp-proxy/mcpproxy-go/cmd/mcpproxy@latest
```

---

### 2. GROWI MCP Server のビルド（ローカル開発の場合）

```bash
cd /path/to/growi-mcp-server
pnpm install
pnpm build
```

ビルド成果物は `dist/index.js` に出力される。

---

### 3. 設定ファイルの作成

`~/.mcpproxy/mcp_config.json` を作成：

#### ローカルビルドを使用する場合（推奨）

```json
{
  "listen": "127.0.0.1:8080",
  "data_dir": "~/.mcpproxy",
  "enable_tray": true,
  "top_k": 5,
  "tools_limit": 15,
  "tool_response_limit": 20000,
  "tls": {
    "enabled": false
  },
  "mcpServers": [
    {
      "name": "growi",
      "command": "node",
      "args": ["/path/to/growi-mcp-server/dist/index.js"],
      "protocol": "stdio",
      "enabled": true,
      "env": {
        "GROWI_DEFAULT_APP_NAME": "my-growi",
        "GROWI_APP_NAME_1": "my-growi",
        "GROWI_API_TOKEN_1": "<YOUR_API_TOKEN>",
        "GROWI_BASE_URL_1": "http://localhost:3000/"
      }
    }
  ]
}
```

#### npm パッケージを使用する場合

```json
{
  "listen": "127.0.0.1:8080",
  "data_dir": "~/.mcpproxy",
  "enable_tray": true,
  "top_k": 5,
  "tools_limit": 15,
  "tool_response_limit": 20000,
  "tls": {
    "enabled": false
  },
  "mcpServers": [
    {
      "name": "growi",
      "command": "npx",
      "args": ["-y", "@growi/mcp-server"],
      "protocol": "stdio",
      "enabled": true,
      "env": {
        "GROWI_DEFAULT_APP_NAME": "my-growi",
        "GROWI_APP_NAME_1": "my-growi",
        "GROWI_API_TOKEN_1": "<YOUR_API_TOKEN>",
        "GROWI_BASE_URL_1": "http://localhost:3000/"
      }
    }
  ]
}
```

> **注意**: `npx` を使用する場合、初回起動時にパッケージダウンロードでタイムアウトする可能性がある。
> ローカルビルドを使用する方が安定する。

#### 複数の GROWI インスタンスを使用する場合

```json
"env": {
  "GROWI_DEFAULT_APP_NAME": "main",
  "GROWI_APP_NAME_1": "main",
  "GROWI_API_TOKEN_1": "token-for-main",
  "GROWI_BASE_URL_1": "https://main.growi.example.com",
  "GROWI_APP_NAME_2": "dev",
  "GROWI_API_TOKEN_2": "token-for-dev",
  "GROWI_BASE_URL_2": "https://dev.growi.example.com"
}
```

---

### 4. MCPProxy の起動

#### 方法1: トレイアプリから起動（推奨・Windows）

スタートメニューから「MCPProxy」を検索して起動、または：

```powershell
"C:\Program Files\mcpproxy\mcpproxy-tray.exe"
```

トレイアプリが自動的にサーバーも起動し、システムトレイにアイコンが表示される。

#### 方法2: コマンドラインから起動

```bash
mcpproxy serve
```

> **注意**: ターミナルから `mcpproxy serve` を実行した場合、システムトレイアイコンは表示されない。
> トレイアイコンが必要な場合は、別途 `mcpproxy-tray.exe` を起動するか、方法1を使用する。

起動すると：
- HTTP サーバーが `:8080` で起動
- 起動ログに API キーが表示される

#### 起動ログの例

```
INFO    Starting mcpproxy       {"version": "v0.15.4"}
WARN    API key was auto-generated for security.
        {"api_key": "ec9eb660...", "web_ui_url": "http://127.0.0.1:8080/ui/?apikey=ec9eb660..."}
```

---

### 5. 接続の確認

#### トレイアイコンから確認

1. タスクバー右下のシステムトレイで MCPProxy アイコンを右クリック
2. **Upstream Servers (1/1)** と表示されていれば接続成功
3. **(0/1)** の場合は接続エラー

#### Web UI から確認

1. トレイアイコン右クリック → **Open Web Control Panel**
2. または起動ログに表示された URL（API キー付き）にアクセス
3. 「Servers」タブで GROWI サーバーの状態を確認

---

### 6. Claude Desktop の設定

`%APPDATA%\Claude\claude_desktop_config.json`（Windows）または
`~/Library/Application Support/Claude/claude_desktop_config.json`（macOS）を編集：

```json
{
  "mcpServers": {
    "mcpproxy": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:8080/mcp"]
    }
  }
}
```

Claude Desktop を再起動すると、MCPProxy 経由で GROWI MCP が利用可能になる。

---

## トラブルシューティング

### Upstream Servers が 0/1 のまま

**原因1: GROWI が起動していない**

```bash
curl http://localhost:3000/
# 応答があれば GROWI は起動している
```

**原因2: タイムアウト（npx 使用時）**

エラーログ:
```
failed to connect: MCP initialize failed for stdio transport: context deadline exceeded
```

解決策: ローカルビルドを使用する（手順2, 3参照）

**原因3: パッケージ名の間違い**

- ❌ `growi-mcp-server`
- ✅ `@growi/mcp-server`

### PATH が通らない（Windows）

MCPProxy インストール後も `mcpproxy` コマンドが認識されない場合：

1. Windows を再起動（またはサインアウト→サインイン）
2. または、フルパスで実行：
   ```
   "C:\Program Files\MCPProxy\mcpproxy.exe" serve
   ```

### Web UI に認証エラーが表示される

起動ログに出力された API キー付き URL を使用する：
```
http://127.0.0.1:8080/ui/?apikey=<YOUR_API_KEY>
```

または、トレイアイコン右クリック → **Open Web Control Panel**

---

## 設定オプション

| オプション | デフォルト | 説明 |
|------------|------------|------|
| `listen` | `127.0.0.1:8080` | サーバーのリッスンアドレス |
| `tools_limit` | 15 | 返却するツールの最大数 |
| `tool_response_limit` | 20000 | レスポンスの最大文字数 |
| `enable_tray` | true | システムトレイアイコンの表示 |
| `top_k` | 5 | ツール検索時の上位K件 |

---

## 参考リンク

- [MCPProxy GitHub](https://github.com/smart-mcp-proxy/mcpproxy-go)
- [GROWI MCP Server](https://github.com/weseek/growi-mcp-server)
- [Code execution with MCP - Anthropic](https://www.anthropic.com/engineering/code-execution-with-mcp)
