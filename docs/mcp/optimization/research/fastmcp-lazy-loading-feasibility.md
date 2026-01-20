# FastMCP における遅延読み込みの実現可能性調査

*調査日: 2026年1月*

---

## 調査目的

Anthropic が提唱する「コード実行方式」の遅延読み込み（Progressive Disclosure）が、FastMCP を使用した現在の GROWI MCP Server で実現可能かを調査する。

---

## 結論

**実現可能。FastMCP との衝突はない。**

理由: Anthropic の遅延読み込みは **MCP サーバー側ではなく、クライアント側（Code Interpreter 内）で実現されるアプローチ** であり、FastMCP の実装に変更は不要。

---

## 調査結果の詳細

### 1. Anthropic 提唱の遅延読み込みとは

Anthropic の記事で提唱される「Progressive Disclosure（段階的開示）」は、以下の仕組みで実現される：

```
従来方式:
  Claude Desktop → MCP tools/list → 全ツール定義をコンテキストにロード

Anthropic 提唱方式:
  Claude Desktop → Code Interpreter → ファイルシステム探索 → 必要なツールのみ読み込み
```

**重要な洞察**: 遅延読み込みは **MCP プロトコルの `tools/list` を使わない**。代わりに、生成された TypeScript コード API をファイルシステムベースで探索する。

### 2. MCP プロトコルの仕様

[MCP Tools Specification (2025-06-18)](https://modelcontextprotocol.io/specification/2025-06-18/server/tools) によると：

| 項目 | 仕様 |
|------|------|
| `tools/list` | 登録されたすべてのツール定義を返す |
| `tools/call` | 指定されたツールを実行する |
| `listChanged` | ツールリスト変更時の通知（オプション） |

MCP プロトコル自体には「一部のツールだけを返す」機能はない。`tools/list` は常にすべてのツールを返す仕様。

### 3. FastMCP の実装方式

現在のプロジェクトでの FastMCP 使用状況：

```typescript
// src/index.ts
const server = new FastMCP({
  name: 'growi-mcp-server',
  version: '1.0.0',
});

// 起動時に全ツールを登録
await loadTools(server);
await server.start({ transportType: 'stdio' });
```

```typescript
// src/tools/page/getPage/register.ts
server.addTool({
  name: 'getPage',
  description: 'Get page data about the specific GROWI page',
  parameters: getPageParamSchema,
  execute: async (params) => { /* ... */ },
});
```

FastMCP は MCP プロトコルに準拠しており、`tools/list` が呼ばれるとすべての登録済みツールを返す。

### 4. なぜ衝突しないのか

Anthropic 方式のアーキテクチャを整理すると：

```
┌─────────────────────────────────────────────────────────────────┐
│ Claude Desktop                                                  │
│   └── MCP Client                                                │
│         └── executeCode ツールのみ認識                           │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ MCP (tools/call: executeCode)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ Code Interpreter MCP                                            │
│                                                                 │
│   ┌───────────────────────────────────────────────────────────┐ │
│   │ MCP サーバー本体（サンドボックス外）                        │ │
│   │   ├── 設定ファイル読み込み                                 │ │
│   │   ├── 子 MCP サーバー起動・管理                            │ │
│   │   └── ツールスキーマ収集 ← ★遅延読み込みはここで実現       │ │
│   └───────────────────────────────────────────────────────────┘ │
│                            │                                    │
│                            │ call_tool() で呼び出し可能         │
│                            ▼                                    │
│   ┌───────────────────────────────────────────────────────────┐ │
│   │ JavaScript サンドボックス（AI 生成コード実行）              │ │
│   │   └── call_tool('getPage', {...})                         │ │
│   │       ※ファイルシステム・ネットワーク等は利用不可          │ │
│   └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ MCP (tools/call: getPage)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ GROWI MCP Server (FastMCP)                                      │
│   └── 従来通り全ツールを登録 ← ★変更不要                         │
└─────────────────────────────────────────────────────────────────┘
```

**ポイント:**

1. **遅延読み込みは Code Interpreter のサーバー本体で実現される**
   - サンドボックス外で設定ファイル・子 MCP サーバーを管理
   - ツールスキーマの収集・遅延読み込みもサーバー本体が担当
   - サンドボックス内の AI 生成コードは `call_tool()` で呼び出すのみ

2. **FastMCP (GROWI MCP) は従来通りの実装でよい**
   - 全ツールを起動時に登録
   - Code Interpreter からの `tools/call` リクエストに応答
   - `tools/list` は Code Interpreter 内部でのみ使用される可能性があるが、トークン消費には影響しない

3. **Claude Desktop は GROWI MCP に直接接続しない**
   - Claude Desktop → Code Interpreter のみ
   - GROWI MCP のツール定義は Claude Desktop のコンテキストに入らない

4. **サンドボックスの制限は AI 生成コードにのみ適用**
   - ファイルシステム・ネットワーク等へのアクセスは不可
   - `call_tool()` 関数で他 MCP サーバーのツールを呼び出すことのみ可能
   - これはセキュリティのための意図的な制限

---

## レイヤー別の役割整理

| レイヤー | 役割 | 遅延読み込みとの関係 |
|----------|------|----------------------|
| Claude Desktop | ユーザーリクエスト処理 | executeCode ツールのみ認識 |
| Code Interpreter MCP（サーバー本体） | 子 MCP 管理・ツールスキーマ収集 | **遅延読み込みを実現** |
| Code Interpreter MCP（サンドボックス） | AI 生成コード実行 | `call_tool()` で呼び出すのみ |
| GROWI MCP Server (FastMCP) | GROWI API へのアクセス提供 | **変更不要** |

---

## よくある誤解と正しい理解

### 誤解 1: FastMCP で遅延読み込みを実装する必要がある

**正しい理解**: 遅延読み込みは FastMCP の責務ではない。Code Interpreter 内でファイルシステムを探索することで実現される。FastMCP は従来通りの実装でよい。

### 誤解 2: MCP プロトコルを拡張する必要がある

**正しい理解**: MCP プロトコル自体は変更不要。Anthropic 方式は MCP プロトコルの上に別のレイヤー（ファイルシステム探索）を追加するアプローチ。

### 誤解 3: FastMCP の tools/list が問題になる

**正しい理解**: Claude Desktop は GROWI MCP に直接接続しないため、GROWI MCP の `tools/list` はトークン消費に影響しない。Code Interpreter 内部での `tools/list` 呼び出しは、コンテキスト外で処理される。

---

## 実装への影響

### FastMCP (GROWI MCP Server)

| 項目 | 影響 |
|------|------|
| ツール登録方式 | 変更不要（`server.addTool()` をそのまま使用） |
| ツール実装 | 変更不要 |
| 起動方式 | 変更不要 |

### 新規実装が必要なもの

| 項目 | 内容 |
|------|------|
| 生成コード API | `servers/growi/*.ts` の生成（Story 2 で対応） |
| Code Interpreter 導入 | 外部 MCP サーバーの選定・導入（Story 1 で対応） |

---

## 追加調査: FastMCP の動的ツール機能

FastMCP は動的なツール管理機能もサポートしている：

- **`listChanged` 通知**: ツールリスト変更時にクライアントに通知可能
- **ツールの有効/無効化**: 実行時にツールを動的に有効/無効化可能

ただし、これらの機能は今回の Anthropic 方式では使用しない。遅延読み込みはファイルシステムベースで実現されるため。

---

## 結論と推奨事項

### 結論

**FastMCP と Anthropic 提唱の遅延読み込み方式は衝突しない。**

- 遅延読み込みは **MCPサーバー側（FastMCP）ではなく、クライアント側（Code Interpreter）で実現**
- FastMCP は従来通りの実装を維持できる
- 現在の実装計画（`architecture.md`, `implementation-plan.md`）は正しい方向性

### 推奨事項

1. **FastMCP の実装は変更しない**
   - 現在のツール登録方式をそのまま維持
   - 新しい機能追加も従来通りの方法で実装

2. **生成コード API の実装に注力する**
   - `servers/growi/` ディレクトリ構造の設計
   - TypeScript インターフェースの自動生成
   - `callMCPTool()` ラッパー関数の実装

3. **Code Interpreter の選定を進める**
   - TypeScript 実行サポート
   - 外部モジュールインポート機能
   - サンドボックスセキュリティ

---

## 参考資料

- [Code execution with MCP: building more efficient AI agents - Anthropic](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [MCP Tools Specification (2025-06-18)](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
- [FastMCP (TypeScript) - GitHub](https://github.com/punkpeye/fastmcp)
- [Dynamic tool discovery in MCP - Speakeasy](https://www.speakeasy.com/mcp/tool-design/dynamic-tool-discovery)
- [MCP Code Execution Agent Design - SmartScope](https://smartscope.blog/en/blog/mcp-code-execution-agent-design/)
