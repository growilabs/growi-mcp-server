# MCP トークン最適化 調査サマリー

*作成日: 2026年1月7日*
*詳細ドキュメント: [mcp-token-optimization-techniques.md](./mcp-token-optimization-techniques.md)*

---

## 1. MCPのコンテキストを圧迫する原因

MCPでツールを多数接続すると、以下の **2つの原因** でコンテキストウィンドウが圧迫されます。

### 原因1: ツール定義の肥大化

```mermaid
flowchart LR
    subgraph problem["問題"]
        BOOT["MCP Server起動"]
        LOAD["全ツール定義をロード（20個 = 約5,000トークン）"]
        CTX["LLMコンテキスト"]
    end

    BOOT --> LOAD --> CTX

    style BOOT fill:#e0e0e0,color:#000000
    style LOAD fill:#ffcccc,color:#000000
    style CTX fill:#e0e0e0,color:#000000
```

- MCPクライアントは起動時に **全ツール定義** をコンテキストに読み込む
- ツール数が増えるほど、リクエスト処理前に消費するトークンが増加
- 数千ツールを接続すると、数十万トークンを消費する場合も

### 原因2: 中間データの重複通過

```mermaid
flowchart LR
    A["外部API A"] -->|"1. データ取得"| LLM["LLM"]
    LLM -->|"2. データを書き写し"| B["外部API B"]

    style A fill:#e0e0e0,color:#000000
    style LLM fill:#ffcccc,color:#000000
    style B fill:#e0e0e0,color:#000000
```

- ツール間でデータを受け渡す際、**同じデータがLLMを複数回通過**
- 例: Google Driveの文書をSalesforceに転送 → 文書全体が2回コンテキストを通る
- 大きなドキュメントではコンテキスト上限を超える可能性も

---

## 2. トークン消費削減手法の一覧

調査で特定した主要な最適化手法は以下の通りです。

| 手法 | 削減効果 | 実装難易度 | 概要 |
|------|----------|------------|------|
| **コード実行方式** | 98.7% | 高 | LLMがコードを書き、実行環境で処理 |
| **遅延読み込み** | 90%+ | 中 | ツール定義をオンデマンドで読み込み |
| **コストルーティング** | 70-90% | 中 | タスク複雑度に応じてモデルを選択 |
| **セマンティックキャッシュ** | 50-80% | 中 | 類似リクエストの結果を再利用 |
| **関連性スコアリング** | 40-70% | 中 | 低関連度の情報を優先削除 |
| **コンテキスト圧縮** | 30-60% | 低 | 要約・フィルタリングで圧縮 |
| **時間ベース減衰** | 20-40% | 低 | 古い情報の重要度を低下 |

---

## 3. コンテキスト圧迫をクリティカルに解決する方法

### 結論: コード実行方式（Anthropic提唱）

**両方の原因を根本から解決できる唯一のアプローチ**

```mermaid
flowchart TB
    subgraph solution["コード実行方式の構成要素"]
        A["遅延読み込み - ツール定義をオンデマンドで取得"]
        B["コード生成 - LLMがツール呼び出しコードを書く"]
        C["実行環境 - データ処理をLLM外で実行"]
    end

    A -->|"原因1を解決"| RESULT["両方の問題を解決"]
    B --> RESULT
    C -->|"原因2を解決"| RESULT

    style A fill:#ccffcc,color:#000000
    style B fill:#cceeff,color:#000000
    style C fill:#cceeff,color:#000000
    style RESULT fill:#ccffcc,color:#000000
```

### なぜコード実行方式が最も効果的か

| 観点 | 従来方式 | コード実行方式 |
|------|----------|----------------|
| ツール定義 | 全て事前ロード | **オンデマンド読み込み** |
| ツール呼び出し | LLMが直接実行 | **LLMはコードを書くだけ** |
| 中間データ | LLMを通過 | **実行環境内で完結** |
| 原因1（定義肥大化） | 未解決 | **解決** |
| 原因2（データ重複） | 未解決 | **解決** |

### 補足: 遅延読み込み単体との違い

「遅延読み込み」は「コード実行方式」の **一部** です。

```
コード実行方式 = 遅延読み込み + コード生成 + 実行環境
```

- **遅延読み込み単体**: 原因1のみ解決（定義の肥大化）
- **コード実行方式**: 原因1と原因2の両方を解決

### 他の手法では不十分な理由

各手法が「クリティカルな解決策」とならない理由を以下に示します。

```mermaid
flowchart TB
    subgraph problems["解決すべき問題"]
        P1["原因1 - ツール定義の肥大化"]
        P2["原因2 - 中間データの重複通過"]
    end

    subgraph approaches["各アプローチの限界"]
        LAZY["遅延読み込み → 原因2は未解決"]
        CACHE["セマンティックキャッシュ → 両方とも未解決"]
        COMPRESS["コンテキスト圧縮 → 原因1は未解決、原因2は軽減のみ"]
        SCORE["関連性スコアリング → 対症療法、根本解決ではない"]
        DECAY["時間ベース減衰 → MCP特有の問題に無関係"]
        COST["コストルーティング → コスト最適化であり、コンテキスト問題とは別"]
    end

    P1 -.->|"解決"| LAZY
    P2 -.->|"未解決"| LAZY
    P1 -.->|"未解決"| CACHE
    P2 -.->|"未解決"| CACHE

    style P1 fill:#e0e0e0,color:#000000
    style P2 fill:#e0e0e0,color:#000000
    style LAZY fill:#ffffcc,color:#000000
    style CACHE fill:#ffcccc,color:#000000
    style COMPRESS fill:#ffcccc,color:#000000
    style SCORE fill:#ffcccc,color:#000000
    style DECAY fill:#ffcccc,color:#000000
    style COST fill:#ffcccc,color:#000000
```

- **遅延読み込み** [原因1: ◎ / 原因2: ×] - 中間データは依然としてLLMを通過。大量データ転送時にコンテキスト上限に達する可能性が残る
- **セマンティックキャッシュ** [原因1: × / 原因2: △] - 類似リクエストの再利用に過ぎない。新規リクエストや異なるパターンには効果がない
- **コンテキスト圧縮** [原因1: × / 原因2: △] - データを圧縮してもLLMを通過する構造は変わらない。情報損失のリスクもある
- **関連性スコアリング** [原因1: △ / 原因2: △] - 既にコンテキストに載った情報を削除する「対症療法」。問題の発生自体を防げない
- **時間ベース減衰** [原因1: × / 原因2: ×] - 長時間会話向けの手法。MCPのツール定義・データ転送問題とは直接関係がない
- **コストルーティング** [原因1: × / 原因2: ×] - モデル選択によるコスト最適化であり、コンテキスト消費量自体は変わらない

### 各手法の限界：詳細

#### 遅延読み込み

```mermaid
flowchart LR
    DEF["ツール定義 - オンデマンド読み込み"]
    CALL["ツール呼び出し"]
    DATA["結果データ（10,000文字）"]
    LLM["LLM"]
    NEXT["次の処理"]

    DEF -->|"◎ 原因1解決"| CALL
    CALL --> DATA
    DATA -->|"× 全データ通過"| LLM
    LLM --> NEXT

    style DEF fill:#ccffcc,color:#000000
    style CALL fill:#e0e0e0,color:#000000
    style DATA fill:#ffcccc,color:#000000
    style LLM fill:#e0e0e0,color:#000000
    style NEXT fill:#e0e0e0,color:#000000
```

**限界**: ツール定義の読み込みは最適化されるが、**ツール実行結果は従来通りLLMを通過**する。10,000行のスプレッドシートを取得すれば、その全データがコンテキストに載る。

#### セマンティックキャッシュ

```mermaid
flowchart TB
    REQ1["リクエスト: 最近のページは？"]
    REQ2["リクエスト: ページを作成して"]
    CACHE[("キャッシュ")]
    MISS["キャッシュミス → 通常処理"]

    REQ1 -->|"キャッシュあり"| CACHE
    REQ2 -->|"類似なし"| MISS

    style REQ1 fill:#e0e0e0,color:#000000
    style REQ2 fill:#e0e0e0,color:#000000
    style CACHE fill:#cceeff,color:#000000
    style MISS fill:#ffcccc,color:#000000
```

**限界**: **過去に類似リクエストがあった場合のみ有効**。新しいタスクや異なる操作パターンでは効果がない。また、ツール定義の肥大化問題には一切対処できない。

#### コンテキスト圧縮

```mermaid
flowchart LR
    RAW["元データ - 10,000行"]
    COMPRESS["圧縮処理"]
    SMALL["圧縮データ - 1,000行"]
    LLM["LLM"]

    RAW --> COMPRESS
    COMPRESS --> SMALL
    SMALL -->|"まだLLMを通過"| LLM

    style RAW fill:#ffcccc,color:#000000
    style COMPRESS fill:#e0e0e0,color:#000000
    style SMALL fill:#ffffcc,color:#000000
    style LLM fill:#e0e0e0,color:#000000
```

**限界**: データ量は減るが、**LLMを通過する構造は変わらない**。また、圧縮による情報損失で精度が低下するリスクがある。ツール定義の肥大化問題には対処できない。

#### 関連性スコアリング

**限界**: コンテキストに載った情報を「後から削除」する手法。**問題が発生した後の対症療法**であり、そもそも不要な情報がコンテキストに載ること自体を防げない。

#### 時間ベース減衰

**限界**: 長時間の会話で古い情報を削除する手法。**MCPのツール定義や単発のデータ転送とは無関係**。マルチターン会話の履歴管理には有効だが、今回の問題の解決策にはならない。

#### コストルーティング

**限界**: タスクに応じて安いモデルを使う手法。**トークン消費量自体は変わらない**。コスト最適化であり、コンテキスト圧迫問題とは別の観点。

---

## 4. 結論: 推奨アプローチ

### 最も効果的なアプローチ: **コード実行方式**

```mermaid
flowchart LR
    subgraph recommend["推奨"]
        CODE["コード実行方式 - 効果: 98.7%削減"]
    end

    subgraph alternative["代替案（部分的解決）"]
        LAZY["遅延読み込み - 効果: 90%+削減"]
    end

    style CODE fill:#ccffcc,color:#000000
    style LAZY fill:#ffffcc,color:#000000
```

| 項目 | 内容 |
|------|------|
| **推奨アプローチ** | コード実行方式（Anthropic提唱） |
| **効果** | トークン消費 98.7% 削減 |
| **解決する問題** | 原因1（定義肥大化）+ 原因2（データ重複）の両方 |
| **必要なもの** | サンドボックス実行環境、セキュリティ対策 |

### 段階的導入が現実的な場合

インフラ投資が難しい場合は、以下の段階的アプローチを推奨：

```mermaid
flowchart LR
    P1["Phase 1 - 遅延読み込み"]
    P2["Phase 2 - コンテキスト圧縮"]
    P3["Phase 3 - コード実行方式"]
    GOAL["両方の問題解決"]

    P1 -->|"原因1を解決"| P2
    P2 -->|"補助的改善"| P3
    P3 -->|"完全解決"| GOAL

    style P1 fill:#ccffcc,color:#000000
    style P2 fill:#ffffcc,color:#000000
    style P3 fill:#cceeff,color:#000000
    style GOAL fill:#ccffcc,color:#000000
```

| Phase | アプローチ | 効果 | 解決する問題 |
|-------|------------|------|--------------|
| 1 | 遅延読み込み | 90%+ | 原因1のみ |
| 2 | コンテキスト圧縮 | +30-60% | 原因2を軽減 |
| 3 | コード実行方式 | 98.7% | 両方を完全解決 |

---

## 参考資料

- [Code execution with MCP: building more efficient AI agents - Anthropic](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [MCP Token Optimization Strategies - Tetrate](https://tetrate.io/learn/ai/mcp/token-optimization-strategies)
- [MCP Specification](https://modelcontextprotocol.io/specification/2025-11-25)

---

## 関連ドキュメント

- [詳細調査ドキュメント](./mcp-token-optimization-techniques.md) - 各手法の詳細な解説
- [Anthropic記事の日本語訳](./code-execution-with-mcp.md) - コード実行方式の原文翻訳
