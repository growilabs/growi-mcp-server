# Code Interpreter MCP 調査結果

調査日: 2026年1月（要件定義後に再調査）

---

## 概要

GROWI MCP のトークン消費削減のため、分離型アプローチで使用するコード実行用 MCP サーバーを調査した。
要件定義は [code-interpreter-requirements.md](./code-interpreter-requirements.md) を参照。

---

## 要件適合性比較

### 必須要件（Must）

| 候補 | M1: コード実行 | M2: 他MCP呼出 | M3: サンドボックス | M4: 出力制御 |
| ---- | -------------- | ------------- | ------------------ | ------------ |
| **E2B** | ○ | ○ | ○ | ○ |
| **MCPProxy** | ○ | ○ | ○ | ○ |
| **Codemode-MCP** | ○ | ○ | ○ | ○ |
| Riza | ○ | △ | ○ | ○ |
| Node Code Sandbox | ○ | × | ○ | ○ |
| Python Interpreter | ○ | × | △ | ○ |

凡例: ○=満たす, △=不明確/部分的, ×=満たさない

### 重要要件（Should）

| 候補 | S1: JS/TS | S2: 低レイテンシ | S3: Claude Desktop | S4: メンテナンス |
|------|-----------|-----------------|-------------------|----------------|
| **E2B** | ○ | △（クラウド） | ○ | ○ |
| **MCPProxy** | ○ | ○（ローカル） | ○ | ○ |
| **Codemode-MCP** | ○ | ○（ローカル） | ○ | ×（中止） |
| Riza | ○ | △（クラウド） | ○ | ○ |
| Node Code Sandbox | ○ | ○（ローカル） | ○ | ○ |

---

## 有力候補の詳細

### 1. E2B Code Interpreter MCP

GitHub: [e2b-dev/mcp-server](https://github.com/e2b-dev/mcp-server)

| 項目 | 内容 |
|------|------|
| M2 実現方式 | Docker MCP Gateway 経由（200+ ツール連携可能） |
| 実行環境 | クラウドサンドボックス（~150ms 起動） |
| 言語 | Python, JavaScript |
| 料金 | 無料枠あり（$100クレジット）、従量課金 $0.05/時間 |

**メリット:**

- Docker との公式パートナーシップで MCP 連携が充実
- セキュリティ対策済みのクラウド環境
- 設定が簡単（npx で起動可能）

**デメリット:**

- クラウドサービスのため外部依存
- レイテンシ（ネットワーク経由）
- 長期運用ではコストが発生

**Claude Desktop 設定例:**

```json
{
  "mcpServers": {
    "e2b": {
      "command": "npx",
      "args": ["-y", "@e2b/mcp-server"],
      "env": {
        "E2B_API_KEY": "your-api-key"
      }
    }
  }
}
```

---

### 2. MCPProxy

GitHub: [smart-mcp-proxy/mcpproxy-go](https://github.com/smart-mcp-proxy/mcpproxy-go)

| 項目 | 内容 |
|------|------|
| M2 実現方式 | `code_execution` ツール + `call_tool()` 関数 |
| 実行環境 | ローカル JavaScript サンドボックス（ES5.1+） |
| 言語 | JavaScript（ES5.1+ built-ins のみ） |
| 料金 | 無料（OSS、Apache-2.0） |

**メリット:**

- ローカル実行で低レイテンシ
- 無料・セルフホスト可能
- Web UI で監視・デバッグ可能
- Windows / macOS インストーラーあり

**デメリット:**

- サンドボックス制限が厳しい（Node.js モジュール不可）
- 比較的新しい実装（成熟度）

**Claude Desktop 設定例:**

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

**セキュリティ制限:**

- ファイルシステムアクセス不可
- ネットワークアクセス不可
- Node.js モジュール不可
- タイマー不可
- 環境変数アクセス不可
- `call_tool()` のみで外部連携

---

### 3. Codemode-MCP（参考）

GitHub: [jx-codes/codemode-mcp](https://github.com/jx-codes/codemode-mcp)

| 項目 | 内容 |
|------|------|
| M2 実現方式 | HTTP プロキシ経由（localhost:3001/mcp/*） |
| 実行環境 | Deno サンドボックス |
| 言語 | TypeScript/JavaScript |
| 料金 | 無料（OSS） |

**注意:** 著者がメンテナンスを中止し、別プロジェクト（lootbox）に移行。
本番利用は非推奨だが、アーキテクチャの参考になる。

---

## M2 要件を満たさない候補

以下は M2（他 MCP サーバー呼び出し）要件を満たさない、または不明確なため除外。

### Riza Code Interpreter

- GitHub: [riza-io/riza-mcp](https://github.com/riza-io/riza-mcp)
- 問題: 他 MCP サーバーとの連携機能が確認できない
- 用途: 単独のコード実行には適しているが、GROWI MCP 連携には不向き

### Node Code Sandbox MCP

- GitHub: [alfonsograziano/node-code-sandbox-mcp](https://github.com/alfonsograziano/node-code-sandbox-mcp)
- 問題: 他 MCP サーバーとの連携機能なし
- 用途: 独立した JavaScript 実行環境としては優秀

### Python Interpreter MCP

- 問題: Python 専用、他 MCP 連携なし、サンドボックスが限定的

---

## 推奨

| 優先度 | 候補     | 理由                                                       |
| ------ | -------- | ---------------------------------------------------------- |
| 1      | MCPProxy | M2 要件を満たし、ローカル実行で低コスト・低レイテンシ      |
| 2      | E2B      | M2 要件を満たし、成熟したクラウド環境。コスト許容なら有力  |

**MCPProxy を第一候補として検証を推奨。**
ただし、サンドボックス制限（ES5.1+ のみ）が GROWI MCP 連携で問題にならないか要検証。

---

## 参考リンク

- [Code execution with MCP - Anthropic](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [Code Mode: the better way to use MCP - Cloudflare](https://blog.cloudflare.com/code-mode/)
- [MCPProxy Discussion #627](https://github.com/orgs/modelcontextprotocol/discussions/627)
- [E2B Pricing](https://e2b.dev/pricing)
- [Docker & E2B MCP Partnership](https://e2b.dev/blog/docker-e2b-partner-to-introduce-mcp-support-in-e2b-sandbox)
