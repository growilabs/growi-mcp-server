# Code Interpreter MCP 調査結果

調査日: 2026-01-16

## Code Interpreter MCP とは

**Code Interpreter MCP** は、Model Context Protocol（MCP）とコード実行機能を組み合わせた技術です。

### Model Context Protocol（MCP）について

MCPは、Anthropicが2024年11月に発表したオープンスタンダードで、AIモデル（LLM）と外部ツールやデータソースとの連携を標準化するプロトコルです。

**主な特徴：**
- JSON-RPC 2.0上で動作
- Python、TypeScript、C#、Javaなど複数のSDKを提供
- Language Server Protocol（LSP）に似たメッセージフロー設計

### Code Interpreterとの統合

Anthropicの研究によると、MCPでコード実行を行う際に：

- ツールを冗長なJSONスキーマではなく「発見可能なコード」として表現
- **コンテキストオーバーヘッドを98.7%削減**
- より複雑なマルチステップワークフローが可能に

### 現在の普及状況（2025年）

- 月間9,700万以上のSDKダウンロード
- 10,000以上のアクティブサーバー
- ChatGPT、Claude、Cursor、Gemini、VS Codeなど主要プラットフォームが採用
- 2025年12月にLinux Foundation傘下のAgentic AI Foundation（AAIF）に寄贈

### 主なユースケース

- 大規模データ分析
- エンタープライズ自動化
- コードマイグレーション
- テスト実行プラットフォーム
- マルチエージェントシステム

---

## Claude Desktop で利用可能な Code Interpreter MCP サーバー

### 1. E2B Code Interpreter MCP

**最も人気のある選択肢**

- **GitHub**: https://github.com/e2b-dev/mcp-server
- **特徴**:
  - セキュアなクラウドサンドボックス環境でコード実行
  - Python/JavaScript対応
  - シェルコマンド実行可能
  - ローカル環境を汚さずに安全にコード実行

**設定例:**
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

### 2. Riza Code Interpreter MCP

- **ドキュメント**: https://docs.riza.io/getting-started/mcp-servers
- **特徴**:
  - リモートMCPサーバーとして提供
  - URL: `https://mcp.riza.io/code-interpreter`
  - OpenAI/Anthropic API両方で利用可能

---

### 3. Python Interpreter MCP

- **情報**: https://lobehub.com/mcp/barvhaim-python-interpreter-mcp
- **特徴**:
  - REST API経由でPythonコード実行
  - `execute_python_code` ツールを提供
  - ローカルのPythonインタープリターサービスと連携

---

### 4. CodeMCP（開発用）

- **GitHub**: https://github.com/ezyang/codemcp
- **特徴**:
  - ペアプログラミングアシスタント
  - ファイル編集・テスト実行が可能
  - ※現在はClaude Codeの登場により非推奨

---

## 設定ファイルの場所

Claude Desktopの設定ファイル:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

---

## おすすめ

| 用途 | おすすめサーバー |
|------|-----------------|
| 安全なコード実行 | **E2B** |
| クラウドAPI連携 | **Riza** |
| ローカルPython | **Python Interpreter MCP** |

---

## 参考リンク

- [Model Context Protocol - Wikipedia](https://en.wikipedia.org/wiki/Model_Context_Protocol)
- [One Year of MCP: November 2025 Spec Release](http://blog.modelcontextprotocol.io/posts/2025-11-25-first-mcp-anniversary/)
- [Scaling Agents with Code Execution and the Model Context Protocol](https://medium.com/@madhur.prashant7/scaling-agents-with-code-execution-and-the-model-context-protocol-a4c263fa7f61)
- [E2B MCP Server - GitHub](https://github.com/e2b-dev/mcp-server)
- [Riza MCP Server Documentation](https://docs.riza.io/getting-started/mcp-servers)
- [Python Interpreter MCP - LobeHub](https://lobehub.com/mcp/barvhaim-python-interpreter-mcp)
- [CodeMCP - GitHub](https://github.com/ezyang/codemcp)
- [Connect to local MCP servers - MCP Docs](https://modelcontextprotocol.io/docs/develop/connect-local-servers)
