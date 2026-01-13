# MCP トークン最適化手法まとめ

*調査日: 2026年1月7日*

---

## 概要

Model Context Protocol（MCP）の普及に伴い、多数のツールを接続したエージェントではトークン消費が課題となっています。本ドキュメントでは、MCPのトークン効率を改善するための各種手法をまとめます。

---

## 背景：なぜトークン最適化が必要か

MCPでツールを多数接続すると、以下の2つの問題が発生します：

### 問題1: ツール定義によるコンテキスト圧迫

```mermaid
flowchart TB
    subgraph server["MCP Server 起動時"]
        T1["Tool 1 の定義"]
        T2["Tool 2 の定義"]
        T3["Tool 3 の定義"]
        TN["... Tool 20 の定義"]
    end

    subgraph context["LLM コンテキストウィンドウ"]
        ALL["全ツール定義が載る<br/>数千〜数万トークン消費"]
    end

    server --> context

    style T1 fill:#e0e0e0,color:#000000
    style T2 fill:#e0e0e0,color:#000000
    style T3 fill:#e0e0e0,color:#000000
    style TN fill:#e0e0e0,color:#000000
    style ALL fill:#ffcccc,color:#000000
```

### 問題2: 中間データの重複通過

```mermaid
flowchart LR
    A["外部API A"] -->|"データ取得"| LLM["LLM"]
    LLM -->|"データを書き写し"| B["外部API B"]

    A -.->|"1回目通過"| LLM
    LLM -.->|"2回目通過<br/>（無駄）"| B

    style A fill:#e0e0e0,color:#000000
    style LLM fill:#ffcccc,color:#000000
    style B fill:#e0e0e0,color:#000000
```

---

## 最適化手法一覧

### 1. コード実行方式（Anthropic提唱）

**概要**: LLMがツールを直接呼び出す代わりに、コードを書いて実行環境に処理を委譲する手法。

**従来方式**:

```mermaid
flowchart LR
    LLM["LLM<br/>（全ツール定義を保持）"]
    MCP["MCP Server"]
    API["外部API"]

    LLM -->|"ツール呼び出し"| MCP
    MCP --> API
    API -->|"結果"| MCP
    MCP -->|"結果（全データ）"| LLM

    style LLM fill:#ffcccc,color:#000000
    style MCP fill:#e0e0e0,color:#000000
    style API fill:#e0e0e0,color:#000000
```

**改善後（コード実行方式）**:

```mermaid
flowchart LR
    LLM["LLM<br/>（executeCodeのみ）"]
    ENV["実行環境"]
    MCP["MCP Server"]
    API["外部API"]

    LLM -->|"コードを書く"| ENV
    ENV -->|"ツール呼び出し"| MCP
    MCP --> API
    API --> MCP
    MCP -->|"結果"| ENV
    ENV -->|"加工済みデータのみ"| LLM

    style LLM fill:#ccffcc,color:#000000
    style ENV fill:#cceeff,color:#000000
    style MCP fill:#e0e0e0,color:#000000
    style API fill:#e0e0e0,color:#000000
```

**実装例**:
```typescript
// LLMが生成するコード
import * as growi from './servers/growi';

const pages = await growi.getUserRecentPages({ id: 'user123' });
const titles = pages.map(p => p.title);
console.log(titles);  // 加工済みデータだけがLLMに返る
```

**効果**: トークン使用量 **98.7%削減**

**トレードオフ**:
- サンドボックス環境が必要
- セキュリティの考慮が必要
- インフラの複雑さが増す

**参考**: [Code execution with MCP - Anthropic](https://www.anthropic.com/engineering/code-execution-with-mcp)

---

### 2. セマンティックキャッシング

**概要**: 意味的に類似したリクエストに対して、キャッシュされた結果を再利用する手法。

```mermaid
flowchart TB
    A["リクエストA<br/>「GROWIの最近のページは？」"]
    CALC["結果を計算"]
    CACHE[("キャッシュ")]
    B["リクエストB<br/>「GROWIの最新ページ教えて」"]
    SIM{"意味的に<br/>類似？"}
    RET["キャッシュから返却<br/>（再計算不要）"]

    A --> CALC
    CALC -->|"保存"| CACHE
    B --> SIM
    SIM -->|"Yes"| CACHE
    CACHE --> RET

    style A fill:#e0e0e0,color:#000000
    style CALC fill:#e0e0e0,color:#000000
    style CACHE fill:#cceeff,color:#000000
    style B fill:#e0e0e0,color:#000000
    style SIM fill:#e0e0e0,color:#000000
    style RET fill:#ccffcc,color:#000000
```

**実装アプローチ**:
- 埋め込みベクトルによる類似度計算
- 閾値を超えた類似度でキャッシュヒット判定
- TTL（有効期限）による鮮度管理

**効果**: **50-80%削減**（類似リクエストが多い場合）

---

### 3. コンテキスト圧縮

**概要**: コンテキストに含める情報を圧縮・要約して、トークン数を削減する手法。

```mermaid
flowchart LR
    subgraph before["圧縮前"]
        RAW["10,000行の<br/>生データ"]
    end

    subgraph process["圧縮処理"]
        SUMM["要約生成"]
        FILTER["重要部分抽出"]
    end

    subgraph after["圧縮後"]
        COMP["要約 + 重要10件<br/>（数百行）"]
    end

    RAW --> SUMM
    RAW --> FILTER
    SUMM --> COMP
    FILTER --> COMP

    style RAW fill:#ffcccc,color:#000000
    style SUMM fill:#e0e0e0,color:#000000
    style FILTER fill:#e0e0e0,color:#000000
    style COMP fill:#ccffcc,color:#000000
```

**手法の種類**:

| 手法 | 説明 | 適用場面 |
|------|------|----------|
| **抽出型要約** | 重要な文・段落をそのまま抜き出す | ドキュメント要約 |
| **抽象型要約** | 内容を短く言い換える | 長文の圧縮 |
| **階層的表現** | 詳細度を段階的に管理 | 複雑な構造データ |
| **チャンク化** | 大きなデータを分割して必要部分だけ使用 | 大規模データ処理 |

**実装例**:
```typescript
// 圧縮前: 10,000行のデータ
const allData = await fetchLargeDataset();

// 圧縮後: 要約 + 重要部分のみ
const compressed = {
  summary: "全10,000件のうち、未処理は150件",
  importantItems: allData.filter(d => d.priority === 'high').slice(0, 10)
};
```

**効果**: **30-60%削減**

---

### 4. 関連性スコアリング

**概要**: コンテキスト内の各情報に関連性スコアを付与し、低関連度の情報を優先的に削除する手法。

```mermaid
flowchart TB
    subgraph input["コンテキストブロック"]
        B1["ページ作成API説明<br/>relevance: 0.95"]
        B2["ユーザー設定説明<br/>relevance: 0.30"]
        B3["検索機能説明<br/>relevance: 0.85"]
        B4["認証API説明<br/>relevance: 0.20"]
    end

    BUDGET{"トークン予算<br/>チェック"}

    subgraph output["最適化後"]
        O1["ページ作成API説明"]
        O3["検索機能説明"]
    end

    B1 --> BUDGET
    B2 --> BUDGET
    B3 --> BUDGET
    B4 --> BUDGET
    BUDGET -->|"高スコアのみ残す"| output

    style B1 fill:#e0e0e0,color:#000000
    style B2 fill:#ffcccc,color:#000000
    style B3 fill:#e0e0e0,color:#000000
    style B4 fill:#ffcccc,color:#000000
    style BUDGET fill:#e0e0e0,color:#000000
    style O1 fill:#ccffcc,color:#000000
    style O3 fill:#ccffcc,color:#000000
```

**スコアリング手法**:
- TF-IDFベクトル化 + コサイン類似度
- 埋め込みベクトルによるセマンティック類似度
- キーワードマッチングによる単純スコアリング

**効果**: **40-70%削減**

---

### 5. 時間ベース減衰（Time-based Decay）

**概要**: 古いコンテキスト情報の重要度を時間経過とともに低下させ、優先的に削除対象とする手法。

```mermaid
flowchart LR
    subgraph timeline["時間経過による重要度変化"]
        T1["5分前<br/>重要度: 100%"]
        T2["30分前<br/>重要度: 50%"]
        T3["2時間前<br/>重要度: 10%"]
    end

    T1 -->|"時間経過"| T2
    T2 -->|"時間経過"| T3

    style T1 fill:#ccffcc,color:#000000
    style T2 fill:#ffffcc,color:#000000
    style T3 fill:#ffcccc,color:#000000
```

**数式**: `重要度 = 初期重要度 × e^(-λ × 経過時間)`

**適用場面**:
- マルチターン会話での履歴管理
- リアルタイムデータストリームの処理
- 長時間稼働するエージェント

**効果**: **20-40%削減**（長時間会話で効果大）

---

### 6. 遅延読み込み（Progressive Disclosure）

**概要**: 全ツール定義を最初に読み込むのではなく、必要になった時点で動的に読み込む手法。

**従来方式**:

```mermaid
flowchart LR
    START["起動時"]
    LOAD["全20ツール定義ロード<br/>5,000トークン"]
    CONTEXT["コンテキスト"]

    START --> LOAD
    LOAD --> CONTEXT

    style START fill:#e0e0e0,color:#000000
    style LOAD fill:#ffcccc,color:#000000
    style CONTEXT fill:#e0e0e0,color:#000000
```

**改善後（遅延読み込み）**:

```mermaid
flowchart TB
    START["起動時"]
    LIST["ツール一覧のみ<br/>200トークン"]

    REQ1["「ページを作成して」"]
    LOAD1["createPage定義ロード<br/>+250トークン"]

    REQ2["「検索して」"]
    LOAD2["searchPages定義ロード<br/>+250トークン"]

    START --> LIST
    REQ1 --> LOAD1
    REQ2 --> LOAD2

    style START fill:#e0e0e0,color:#000000
    style LIST fill:#ccffcc,color:#000000
    style REQ1 fill:#e0e0e0,color:#000000
    style LOAD1 fill:#cceeff,color:#000000
    style REQ2 fill:#e0e0e0,color:#000000
    style LOAD2 fill:#cceeff,color:#000000
```

**実装アプローチ**:
- ツール定義をファイルシステム上に配置
- `search_tools` メタツールで必要なツールを検索
- 詳細レベルパラメータ（名前のみ / 説明付き / 完全定義）

**効果**: **90%以上削減**（ツール数が多いほど効果的）

---

### 7. コスト認識型ルーティング

**概要**: タスクの複雑さに応じて、適切なコストのモデルにルーティングする手法。

```mermaid
flowchart TB
    TASK["タスク入力"]
    CLASSIFY{"タスク分類器"}

    subgraph simple["簡単なタスク"]
        S_DESC["単純なCRUD操作"]
        S_MODEL["軽量モデル<br/>$0.01/1K tokens"]
    end

    subgraph complex["複雑なタスク"]
        C_DESC["推論・分析が必要"]
        C_MODEL["高性能モデル<br/>$0.15/1K tokens"]
    end

    TASK --> CLASSIFY
    CLASSIFY -->|"簡単"| simple
    CLASSIFY -->|"複雑"| complex

    style TASK fill:#e0e0e0,color:#000000
    style CLASSIFY fill:#e0e0e0,color:#000000
    style S_DESC fill:#e0e0e0,color:#000000
    style S_MODEL fill:#ccffcc,color:#000000
    style C_DESC fill:#e0e0e0,color:#000000
    style C_MODEL fill:#ffffcc,color:#000000
```

**分類基準の例**:
- 必要なツール数
- 推論ステップ数
- 出力の複雑さ

**効果**: **70-90%コスト削減**

---

### 8. リアルタイム最適化ループ

**概要**: バックグラウンドで継続的にコンテキストを監視・最適化する手法。

```mermaid
flowchart TB
    subgraph loop["最適化ループ（50ms間隔）"]
        MONITOR["1. コンテキストサイズ監視"]
        CHECK{"2. 閾値超過？"}
        DELETE["3. 低関連度・古い情報を削除"]
        COMPRESS["4. 圧縮可能部分を圧縮"]
    end

    MONITOR --> CHECK
    CHECK -->|"Yes"| DELETE
    DELETE --> COMPRESS
    COMPRESS --> MONITOR
    CHECK -->|"No"| MONITOR

    style MONITOR fill:#e0e0e0,color:#000000
    style CHECK fill:#e0e0e0,color:#000000
    style DELETE fill:#e0e0e0,color:#000000
    style COMPRESS fill:#e0e0e0,color:#000000
```

**効果**: 継続的なコンテキスト管理により、急激なトークン増加を防止

---

## 手法比較表

| 手法 | 削減効果 | 実装難易度 | 導入コスト | 最適な場面 |
|------|----------|------------|------------|------------|
| コード実行 | 98.7% | 高 | 高 | 複雑なワークフロー |
| セマンティックキャッシュ | 50-80% | 中 | 中 | 類似リクエストが多い |
| コンテキスト圧縮 | 30-60% | 低 | 低 | 大量データ処理 |
| 関連性スコアリング | 40-70% | 中 | 中 | 動的なコンテキスト管理 |
| 時間ベース減衰 | 20-40% | 低 | 低 | 長時間会話 |
| 遅延読み込み | 90%+ | 中 | 中 | ツール数が多い |
| コストルーティング | 70-90% | 中 | 中 | コスト最適化重視 |
| リアルタイム最適化 | 可変 | 高 | 高 | 長時間稼働エージェント |

```mermaid
flowchart TB
    subgraph high_effect_high_difficulty["高効果・高難易度"]
        A1["コード実行<br/>効果:98.7% 難易度:高"]
    end

    subgraph high_effect_mid_difficulty["高効果・中難易度"]
        B1["遅延読み込み<br/>効果:90%+ 難易度:中"]
        B2["コストルーティング<br/>効果:70-90% 難易度:中"]
    end

    subgraph mid_effect_mid_difficulty["中効果・中難易度"]
        C1["セマンティックキャッシュ<br/>効果:50-80% 難易度:中"]
        C2["関連性スコアリング<br/>効果:40-70% 難易度:中"]
    end

    subgraph low_effect_low_difficulty["低効果・低難易度"]
        D1["コンテキスト圧縮<br/>効果:30-60% 難易度:低"]
        D2["時間ベース減衰<br/>効果:20-40% 難易度:低"]
    end

    subgraph mid_effect_high_difficulty["中効果・高難易度"]
        E1["リアルタイム最適化<br/>効果:可変 難易度:高"]
    end

    style A1 fill:#ffcccc,color:#000000
    style B1 fill:#ccffcc,color:#000000
    style B2 fill:#ccffcc,color:#000000
    style C1 fill:#ffffcc,color:#000000
    style C2 fill:#ffffcc,color:#000000
    style D1 fill:#cceeff,color:#000000
    style D2 fill:#cceeff,color:#000000
    style E1 fill:#ffddcc,color:#000000
```

---

## 推奨される組み合わせ

### シナリオ1: ツール数が多いMCPサーバー

```mermaid
flowchart LR
    A["遅延読み込み<br/>（必須）"] --> B["関連性スコアリング"]
    B --> C["コンテキスト圧縮"]

    style A fill:#ff9999,color:#000000
    style B fill:#e0e0e0,color:#000000
    style C fill:#e0e0e0,color:#000000
```

### シナリオ2: 大量データを扱うエージェント

```mermaid
flowchart LR
    A["コード実行方式<br/>（必須）"] --> B["コンテキスト圧縮"]
    B --> C["セマンティックキャッシュ"]

    style A fill:#ff9999,color:#000000
    style B fill:#e0e0e0,color:#000000
    style C fill:#e0e0e0,color:#000000
```

### シナリオ3: コスト最適化が重要な本番環境

```mermaid
flowchart LR
    A["コストルーティング<br/>（必須）"] --> B["セマンティックキャッシュ"]
    B --> C["遅延読み込み"]

    style A fill:#ff9999,color:#000000
    style B fill:#e0e0e0,color:#000000
    style C fill:#e0e0e0,color:#000000
```

### シナリオ4: 長時間稼働する対話エージェント

```mermaid
flowchart LR
    A["時間ベース減衰<br/>（必須）"] --> B["リアルタイム最適化"]
    B --> C["関連性スコアリング"]

    style A fill:#ff9999,color:#000000
    style B fill:#e0e0e0,color:#000000
    style C fill:#e0e0e0,color:#000000
```

---

## 参考資料

- [Code execution with MCP: building more efficient AI agents - Anthropic](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [MCP Token Optimization Strategies - Tetrate](https://tetrate.io/learn/ai/mcp/token-optimization-strategies)
- [Implementing Model Context Protocol in Autonomous Multi-Agent Systems - Subhadip Mitra](https://subhadipmitra.com/blog/2025/implementing-model-context-protocol/)
- [The Model Context Protocol's impact on 2025 - Thoughtworks](https://www.thoughtworks.com/en-us/insights/blog/generative-ai/model-context-protocol-mcp-impact-2025)
- [MCP Specification](https://modelcontextprotocol.io/specification/2025-11-25)

---

## 更新履歴

| 日付       | 内容                                   |
|------------|----------------------------------------|
| 2026-01-07 | 初版作成                               |
| 2026-01-07 | 図をMermaid形式に変更                  |
| 2026-01-08 | Mermaid全ノードにfill/color明示指定    |
