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
| **mcpcodeserver** | ○ | ○ | △ | ○ |
| **Meta-MCP** | ○ | ○ | ○ | ○ |
| **E2B** | ○ | ○ | ○ | ○ |
| MCPProxy | ○ | ○ | ○ | ○ |
| Lootbox | ○ | ○ | ○ | ○ |
| Codemode-MCP | ○ | ○ | ○ | ○ |
| Riza ⚠️ | ○ | △ | ○ | ○ |
| Node Code Sandbox | ○ | × | ○ | ○ |
| Python Interpreter | ○ | × | △ | ○ |

凡例: ○=満たす, △=不明確/部分的, ×=満たさない, ⚠️=サービス終了予定

### 重要要件（Should）

| 候補 | S1: JS/TS | S2: 低レイテンシ | S3: Claude Desktop | S4: メンテナンス |
| ---- | --------- | ---------------- | ------------------ | ---------------- |
| **mcpcodeserver** | ○（TypeScript） | ○（ローカル） | ○ | ○ |
| **Meta-MCP** | ○（TypeScript） | ○（ローカル） | ○ | ○ |
| **E2B** | ○ | △（クラウド） | ○ | ○ |
| MCPProxy | △（ES5.1のみ） | ○（ローカル） | ○ | ○ |
| Lootbox | ○（TypeScript） | ○（ローカル） | ×（非対応） | ○ |
| Codemode-MCP | ○ | ○（ローカル） | ○ | ×（中止） |
| Riza | ○ | △（クラウド） | ○ | ○ |
| Node Code Sandbox | ○ | ○（ローカル） | ○ | ○ |

---

## 有力候補の詳細

### 1. mcpcodeserver（TypeScript 対応・推奨）

GitHub: [zbowling/mcpcodeserver](https://github.com/zbowling/mcpcodeserver)

| 項目 | 内容 |
| ---- | ---- |
| M2 実現方式 | TypeScript コードで `await toolname.function()` として呼び出し |
| 実行環境 | ローカル VM サンドボックス |
| 言語 | TypeScript |
| 料金 | 無料（OSS） |

**メリット:**

- **TypeScript フル対応**（ES5.1 制限なし）
- 複数 MCP サーバーを TypeScript コードで直接呼び出し可能
- `Promise.all()` で並列処理も可能
- Claude Desktop 対応（npx で簡単インストール）
- 子 MCP サーバーのツール変更を自動検知

**デメリット:**

- サンドボックスは「完全にセキュア」ではないと明記（信頼できるコードのみ実行）
- Node.js モジュール不可（MCP ツール経由のみ）

**Claude Desktop 設定例:**

```json
{
  "mcpServers": {
    "mcpcodeserver": {
      "command": "npx",
      "args": ["-y", "mcpcodeserver", "--config", "/path/to/mcp.json"]
    }
  }
}
```

**子 MCP サーバー設定（mcp.json）:**

```json
{
  "mcpServers": {
    "growi": {
      "command": "npx",
      "args": ["-y", "growi-mcp-server"]
    }
  }
}
```

**MCP ツール呼び出し例:**

```typescript
// 複数の MCP ツールを並列実行
const [pages, users] = await Promise.all([
  growi_search_pages({ query: "keyword" }),
  growi_get_users({})
]);
console.log(JSON.stringify({ pages, users }, null, 2));
```

**セキュリティ制限:**

- 最大実行時間: 30秒（設定で最大5分）
- ファイルシステム直接アクセス不可
- MCP ツール経由以外のネットワークアクセス不可
- console メソッド（log, error, warn, info）利用可能

---

### 2. Meta-MCP Server（TypeScript 対応）

npm: [@justanothermldude/meta-mcp-server](https://www.npmjs.com/package/@justanothermldude/meta-mcp-server)

| 項目 | 内容 |
| ---- | ---- |
| M2 実現方式 | 型付きラッパーで MCP ツール呼び出し（mcp-exec） |
| 実行環境 | サンドボックス |
| 言語 | TypeScript |
| 料金 | 無料（OSS） |

**メリット:**

- **TypeScript フル対応**
- Lazy loading で **87-91% トークン削減**
- 型付きラッパーで安全な MCP ツール呼び出し
- Claude Desktop 対応

**デメリット:**

- 比較的新しいプロジェクト

**Claude Desktop 設定例:**

```json
{
  "mcpServers": {
    "meta-mcp": {
      "command": "npx",
      "args": ["-y", "@justanothermldude/meta-mcp-server"],
      "env": {
        "SERVERS_CONFIG": "~/.meta-mcp/servers.json"
      }
    }
  }
}
```

---

### 3. E2B Code Interpreter MCP（クラウド）

GitHub: [e2b-dev/mcp-server](https://github.com/e2b-dev/mcp-server)

| 項目 | 内容 |
|------|------|
| M2 実現方式 | Docker MCP Gateway 経由（200+ ツール連携可能） |
| 実行環境 | クラウドサンドボックス（~150ms 起動） |
| 言語 | Python, JavaScript |
| 料金 | 下記参照 |

**料金プラン:**

| プラン     | 月額   | 内容                                                                 |
| ---------- | ------ | -------------------------------------------------------------------- |
| Hobby      | 無料   | $100 の初回クレジット、最大1時間セッション、20並列サンドボックス     |
| Pro        | $150   | 最大24時間セッション、100並列サンドボックス、CPU/RAM カスタマイズ可  |
| Enterprise | 要相談 | 専用サポート、SLA、オンプレミス対応等                                |

**従量課金（参考）:**

- vCPU: 約 $0.000014/秒
- メモリ: 約 $0.0000045/GiB/秒
- 概算: 1時間あたり約 $0.05（1vCPU, 256MB の場合）

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

### 4. MCPProxy（JavaScript のみ）

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

### 5. Lootbox（Claude Desktop 非対応）

GitHub: [jx-codes/lootbox](https://github.com/jx-codes/lootbox)

| 項目 | 内容 |
| ---- | ---- |
| M2 実現方式 | `tools.mcp_{servername}.function()` で MCP ツール呼び出し |
| 実行環境 | Deno サンドボックス（TypeScript） |
| 言語 | TypeScript |
| 料金 | 無料（OSS） |

**メリット:**

- TypeScript でフル機能のコード記述が可能
- MCP サーバーが `mcp_` prefix で自動公開される
- カスタムツール（.ts ファイル）を追加可能
- YAML ベースのワークフロー機能あり
- Codemode-MCP の後継としてアクティブにメンテナンス

**デメリット:**

- **Claude Desktop 非対応**（WebSocket RPC 方式のため、MCP stdio 非対応）
- Claude Code 専用設計
- インストールが curl スクリプト or ソースビルド

**注意:** 同じ作者の [mcp-rpc](https://github.com/jx-codes/mcp-rpc) には Claude Desktop 用の bridge があるが、Lootbox とは別プロジェクト。

**インストール:**

```bash
curl -fsSL https://raw.githubusercontent.com/jx-codes/lootbox/main/install.sh | bash
```

**MCP サーバー設定例（lootbox.config.json）:**

```json
{
  "mcpServers": {
    "growi": {
      "command": "npx",
      "args": ["-y", "growi-mcp-server"]
    }
  }
}
```

**MCP ツール呼び出し例:**

```typescript
// GROWI MCP のツールを呼び出す
const result = await tools.mcp_growi.search_pages({ query: "keyword" });
console.log(JSON.stringify(result, null, 2));
```

**セキュリティ制限:**

- ユーザースクリプト: `--allow-net` のみ（ネットワークアクセスのみ許可）
- 10秒のタイムアウトで自動終了
- カスタムツール: `--allow-all`（信頼できるコードのみ含める必要）

---

### 6. Codemode-MCP（参考・メンテナンス中止）

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
- **⚠️ サービス終了**: 2025年10月1日にサービス終了予定（選定対象外）

### Node Code Sandbox MCP

- GitHub: [alfonsograziano/node-code-sandbox-mcp](https://github.com/alfonsograziano/node-code-sandbox-mcp)
- 問題: 他 MCP サーバーとの連携機能なし
- 用途: 独立した JavaScript 実行環境としては優秀

### Python Interpreter MCP

- 問題: Python 専用、他 MCP 連携なし、サンドボックスが限定的

---

## 費用比較

| 候補          | 費用                                  | 備考                                           |
| ------------- | ------------------------------------- | ---------------------------------------------- |
| mcpcodeserver | 無料（OSS）                           | ローカル実行、インフラ費用なし                 |
| Meta-MCP      | 無料（OSS）                           | ローカル実行、インフラ費用なし                 |
| E2B           | 無料枠 $100 → Pro $150/月             | クラウド、従量課金あり（約 $0.05/時間）        |
| MCPProxy      | 無料（OSS）                           | ローカル実行、インフラ費用なし                 |
| Lootbox       | 無料（OSS）                           | ローカル実行、インフラ費用なし                 |
| Riza          | ~~無料枠 10万リクエスト/月~~ 終了予定 | **2025年10月サービス終了**                     |

**結論**: 推奨候補（mcpcodeserver, Meta-MCP）はすべて無料の OSS。
E2B は無料枠で検証可能だが、本番運用では月額費用が発生する。

---

## プロジェクト成熟度の比較

有力候補 2 つについて、プロジェクトの成熟度を調査した（2026年1月時点）。

### mcpcodeserver

| 指標 | 値 |
| ---- | ---- |
| GitHub Stars | 13 |
| 最終リリース日 | 2025年10月13日（v1.0.14） |
| リリース頻度 | 14リリース（初回リリース日に集中） |
| コントリビューター数 | 2人 |
| 総コミット数 | 56 |
| リポジトリ作成日 | 2025年10月12日（約3ヶ月前） |

### Meta-MCP

| 指標 | 値 |
| ---- | ---- |
| GitHub Stars | 0 |
| 最終リリース日 | GitHub リリースなし / npm v0.1.8（約1ヶ月前） |
| リリース頻度 | 不明（GitHub リリース未使用、npm で公開） |
| コントリビューター数 | 2人 |
| 総コミット数 | 89 |
| リポジトリ作成日 | 2025年12月14日（約1ヶ月前） |

### 所感

両プロジェクトとも **非常に新しい**（3ヶ月以内）ため、成熟度の観点では判断が難しい。

- **mcpcodeserver**: 約3ヶ月前に作成。Star 数は少ないが存在する（13）
- **Meta-MCP**: 約1ヶ月前に作成。Star 数 0 でまだ認知されていない段階

Star 数の変遷については、両プロジェクトとも期間が短すぎて有意なデータが取れなかった。

---

## 推奨

| 優先度 | 候補          | 言語       | 理由                                                   |
| ------ | ------------- | ---------- | ------------------------------------------------------ |
| 1      | mcpcodeserver | TypeScript | TypeScript フル対応、ローカル実行、MCP 連携が直感的    |
| 2      | Meta-MCP      | TypeScript | TypeScript 対応、Lazy loading でトークン削減           |
| 3      | E2B           | JS/TS      | 成熟したクラウド環境。セキュリティ重視・コスト許容なら |

**mcpcodeserver を第一候補として検証を推奨。**
TypeScript フル対応で、GROWI MCP との連携も直感的に記述可能。

### 参考: 条件付きの候補

| 候補     | 条件                                                                        |
| -------- | --------------------------------------------------------------------------- |
| MCPProxy | JavaScript（ES5.1）で十分な場合は検討可。TypeScript 不可                    |
| Lootbox  | Claude Code 専用。TypeScript フル機能で MCP 連携が直感的だが Desktop 非対応 |

---

## 参考リンク

- [Code execution with MCP - Anthropic](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [Code Mode: the better way to use MCP - Cloudflare](https://blog.cloudflare.com/code-mode/)
- [mcpcodeserver - GitHub](https://github.com/zbowling/mcpcodeserver)
- [Meta-MCP Server - Glama](https://glama.ai/mcp/servers/@blueman82/meta-mcp-server)
- [MCPProxy Discussion #627](https://github.com/orgs/modelcontextprotocol/discussions/627)
- [Lootbox - GitHub](https://github.com/jx-codes/lootbox)
- [E2B Pricing](https://e2b.dev/pricing)
- [Docker & E2B MCP Partnership](https://e2b.dev/blog/docker-e2b-partner-to-introduce-mcp-support-in-e2b-sandbox)
