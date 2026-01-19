# Code Interpreter MCP 調査結果

調査日: 2026年1月（要件定義後に再調査）

---

## 概要

GROWI MCP のトークン消費削減のため、分離型アプローチで使用するコード実行用 MCP サーバーを調査した。
要件定義は [code-interpreter-requirements.md](./code-interpreter-requirements.md) を参照。

---

## 推奨

| 優先度 | 候補          | 言語       | 理由                                                   |
| ------ | ------------- | ---------- | ------------------------------------------------------ |
| 1      | mcpcodeserver | TypeScript | TypeScript フル対応、ローカル実行、MCP 連携が直感的    |
| 2      | E2B           | JS/TS      | 成熟したクラウド環境。セキュリティ重視・コスト許容なら |
| 3      | MCPProxy      | JavaScript | ローカル実行、Web UI でデバッグ可能。ES5.1 制限あり    |

**mcpcodeserver を第一候補として検証を推奨。**
TypeScript フル対応で、GROWI MCP との連携も直感的に記述可能。

---

## 候補比較一覧

| 候補          | Stars | 最終リリース          | ライセンス | 費用                      |
| ------------- | ----: | --------------------- | ---------- | ------------------------- |
| mcpcodeserver |    13 | v1.0.14（2025/10/13） | MIT        | 無料（OSS）               |
| E2B           |   369 | v0.1.1（2025/12/31）  | Apache-2.0 | 無料枠 $100 → Pro $150/月 |
| MCPProxy      |   112 | v0.15.1（2026/01/18） | MIT        | 無料（OSS）               |

**結論**: 有力候補はすべて MIT または Apache-2.0 ライセンスで利用しやすい。
mcpcodeserver を第一候補として推奨。E2B は無料枠で検証可能だが、本番運用では月額費用が発生する。

---

## プロジェクト成熟度の比較

有力候補について、複合指標でプロジェクトの成熟度を調査した（2026年1月19日時点）。

### 複合指標一覧

| 指標 | mcpcodeserver | E2B | MCPProxy |
| ---- | ------------: | --: | -------: |
| 総リリース数 | 14 | 4 | 約100 |
| 活動期間 | 約3ヶ月 | 約3ヶ月 | 約2ヶ月 |
| 月平均リリース数 | 4.7 | 1.3 | 約50 |
| 最終リリースからの経過日数 | 98日 | 19日 | 1日 |
| 直近3ヶ月のコミット数 | 35 | 16 | 100以上 |
| 最終コミットからの経過日数 | 98日 | 12日 | 1日 |

### 各プロジェクトの詳細

#### mcpcodeserver

- **リリース傾向**: 14リリースすべてが初日（2025/10/13）に集中。その後のリリースなし
- **開発状況**: 初期開発フェーズで集中的にリリース、その後は安定期
- **懸念点**: 約3ヶ月間リリースがなく、継続的なメンテナンスが不明確

#### E2B

- **リリース傾向**: 2ヶ月間で4リリース。依存関係の更新が中心
- **開発状況**: 安定したペースで継続的にメンテナンス
- **強み**: 商用サービスとして継続的なサポートが期待できる

#### MCPProxy

- **リリース傾向**: 約2ヶ月で約100リリース（月平均50）。非常に活発
- **開発状況**: 積極的な機能追加とバグ修正。OAuth、設定管理、Web UI 等
- **強み**: 最も活発な開発。ただし JavaScript（ES5.1）制限あり

### 所感

- **最も活発**: MCPProxy（2ヶ月で約100リリース、毎日のようにコミット）
- **安定運用向け**: E2B（商用サービス、継続的なメンテナンス）
- **mcpcodeserver**: 初期集中リリース後は更新なし。機能的には有力だが、継続性に懸念

---

## 要件適合性比較

### 必須要件（Must）

| 候補 | M1: コード実行 | M2: 他MCP呼出 | M3: サンドボックス | M4: 出力制御 |
| ---- | -------------- | ------------- | ------------------ | ------------ |
| Codemode-MCP | ○ | ○ | ○ | ○ |
| E2B | ○ | ○ | ○ | ○ |
| Lootbox | ○ | ○ | ○ | ○ |
| mcpcodeserver | ○ | ○ | △ | ○ |
| MCPProxy | ○ | ○ | ○ | ○ |
| Meta-MCP | ○ | ○ | ○ | ○ |
| Node Code Sandbox | ○ | × | ○ | ○ |
| Python Interpreter | ○ | × | △ | ○ |
| Riza ⚠️ | ○ | △ | ○ | ○ |

凡例: ○=満たす, △=不明確/部分的, ×=満たさない, ⚠️=サービス終了予定

### 重要要件（Should）

| 候補 | S1: JS/TS | S2: 低レイテンシ | S3: Claude Desktop | S4: メンテナンス |
| ---- | --------- | ---------------- | ------------------ | ---------------- |
| Codemode-MCP | ○ | ○（ローカル） | ○ | ×（中止） |
| E2B | ○ | △（クラウド） | ○ | ○ |
| Lootbox | ○（TypeScript） | ○（ローカル） | ×（非対応） | ○ |
| mcpcodeserver | ○（TypeScript） | ○（ローカル） | ○ | ○ |
| MCPProxy | △（ES5.1のみ） | ○（ローカル） | ○ | ○ |
| Meta-MCP | ○（TypeScript） | ○（ローカル） | ○ | ○ |
| Node Code Sandbox | ○ | ○（ローカル） | ○ | ○ |
| Riza | ○ | △（クラウド） | ○ | ○ |

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
| ライセンス | MIT |
| GitHub Stars | 13 |
| 最終リリース | v1.0.14（2025年10月13日） |

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

### 2. E2B Code Interpreter MCP（クラウド）

GitHub: [e2b-dev/mcp-server](https://github.com/e2b-dev/mcp-server)

| 項目 | 内容 |
| ---- | ---- |
| M2 実現方式 | Docker MCP Gateway 経由（200+ ツール連携可能） |
| 実行環境 | クラウドサンドボックス（~150ms 起動） |
| 言語 | Python, JavaScript |
| 料金 | 下記参照 |
| ライセンス | Apache-2.0 |
| GitHub Stars | 369 |
| 最終リリース | v0.1.1（2025年12月31日） |

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

### 3. MCPProxy（JavaScript のみ）

GitHub: [smart-mcp-proxy/mcpproxy-go](https://github.com/smart-mcp-proxy/mcpproxy-go)

| 項目 | 内容 |
| ---- | ---- |
| M2 実現方式 | `code_execution` ツール + `call_tool()` 関数 |
| 実行環境 | ローカル JavaScript サンドボックス（ES5.1+） |
| 言語 | JavaScript（ES5.1+ built-ins のみ） |
| 料金 | 無料（OSS） |
| ライセンス | MIT |
| GitHub Stars | 112 |
| 最終リリース | v0.15.1（2026年1月18日） |

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

## Claude Desktop 非対応のため除外

以下は Claude Desktop に対応していないため除外。Claude Code 専用であれば利用可能。

### Lootbox

- GitHub: [jx-codes/lootbox](https://github.com/jx-codes/lootbox)
- GitHub Stars: 116
- 最終リリース: リリースなし（開発中）
- ライセンス: MIT
- 特徴: TypeScript 対応、Deno サンドボックス、MCP ツール呼び出し可能
- 問題: **Claude Desktop 非対応**（WebSocket RPC 方式のため、MCP stdio 非対応）
- 備考: Claude Code 専用設計。機能的には有力だが、Desktop 非対応のため除外

---

## ライセンス不明のため除外

以下はライセンスが明記されていないため、利用前に作者への確認が必要。

### Meta-MCP Server

- GitHub: [blueman82/meta-mcp-server](https://github.com/blueman82/meta-mcp-server)
- npm: [@justanothermldude/meta-mcp-server](https://www.npmjs.com/package/@justanothermldude/meta-mcp-server)
- GitHub Stars: 0
- 最終リリース: リリースなし（npm v0.1.8 公開中）
- ライセンス: 不明（GitHub/npm にライセンス記載なし）
- 特徴: TypeScript 対応、Lazy loading で 87-91% トークン削減
- 備考: 機能的には有力だが、ライセンス未記載のため本番利用は推奨しない

### Codemode-MCP

- GitHub: [jx-codes/codemode-mcp](https://github.com/jx-codes/codemode-mcp)
- GitHub Stars: 105
- 最終リリース: リリースなし
- ライセンス: 不明（GitHub にライセンス記載なし）
- 特徴: Deno サンドボックス、TypeScript/JavaScript 対応
- 備考: 著者がメンテナンスを中止し、lootbox に移行済み

### Riza Code Interpreter

- GitHub: [riza-io/riza-mcp](https://github.com/riza-io/riza-mcp)
- GitHub Stars: 12
- 最終リリース: リリースなし
- ライセンス: 不明（GitHub にライセンス記載なし）
- 備考: **⚠️ サービス終了予定**（2025年10月1日）

---

## M2 要件を満たさない候補

以下は M2（他 MCP サーバー呼び出し）要件を満たさない、または不明確なため除外。

### Node Code Sandbox MCP

- GitHub: [alfonsograziano/node-code-sandbox-mcp](https://github.com/alfonsograziano/node-code-sandbox-mcp)
- GitHub Stars: 140
- 最終リリース: リリースなし（5 tags あり）
- ライセンス: MIT
- 問題: 他 MCP サーバーとの連携機能なし
- 用途: 独立した JavaScript 実行環境としては優秀

### Python Interpreter MCP

- ライセンス: 不明（具体的なリポジトリ未記載）
- 問題: Python 専用、他 MCP 連携なし、サンドボックスが限定的

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
