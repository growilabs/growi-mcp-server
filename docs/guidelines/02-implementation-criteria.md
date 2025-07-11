# Resource/Tool 実装判断基準

このドキュメントでは、GROWI API を Resource または Tool として実装する際の判断基準について説明します。本ドキュメントは、Model Context Protocol (MCP) の設計思想とFastMCPフレームワークの実装パターンに基づいています。実装の詳細な技術仕様については [リポジトリ概要](./01-repository-overview.md) を参照してください。

## MCPの基本概念

MCPは、LLMとデータソースやツールを標準化された方法で接続するためのプロトコルです。このプロトコルでは、データアクセスとツールの利用に関して以下のような区分を設けています：

- **Resource**: データソースへのアクセスを提供する標準化されたインターフェース
- **Tool**: 特定の機能や操作を実行するための標準化されたインターフェース

## Resource の実装基準

Resource は以下のような特性を持つ API の実装に適しています：

### 主な特徴
- データの取得・参照が主な目的
- 副作用を伴わない操作
- 冪等性の高い操作
- シンプルなパラメータ構造

### 具体例
- ページ情報の取得（`/page`）
- ユーザー情報の取得（`/me`）
- タグ情報の取得（`/tag`）
- ページの階層構造の取得（`/ancestorsChildren`）

## Tool の実装基準

Tool は以下のような特性を持つ API の実装に適しています：

### 主な特徴
- データの作成・更新・削除が主な目的
- 副作用を伴う操作
- 複雑なパラメータ構造を持つ操作
- スキーマ定義（schema.ts）を必要とする操作
- 複数のステップや状態変更を伴う可能性のある操作

### 具体例
- ページの作成（`page/createPage`）
- ページの更新（`page/updatePage`）
- ページの削除（`page/deletePages`）
- ページ名の変更（`page/renamePage`）
- ユーザーの登録（`user/registerUser`）

## 実装の選択基準

新しい API を実装する際は、以下の質問に答えることで Resource か Tool かを判断できます：

1. この API は主にデータの取得を目的としているか？
   - Yes → Resource の可能性が高い
   - No → Tool の可能性が高い

2. この API は副作用を伴うか？
   - Yes → Tool の可能性が高い
   - No → Resource の可能性が高い

3. パラメータの構造は複雑か？
   - Yes → Tool の可能性が高い
   - No → Resource の可能性が高い

4. データの状態を変更する操作か？
   - Yes → Tool の可能性が高い
   - No → Resource の可能性が高い

## 判断に迷う場合

以下のような場合は、より慎重な検討が必要です：

1. データの取得と更新の両方を含む操作
   - 主たる目的が更新の場合は Tool
   - 主たる目的が取得の場合は Resource

2. 複数のリソースに跨がる操作
   - 一般的に Tool として実装することを推奨
   - 特に、トランザクション的な処理や複数のステップを含む場合

3. バッチ処理や一括操作
   - 複雑な処理や状態変更を伴う場合は Tool
   - 単純なデータ取得の集約の場合は Resource

## コードの構成

### Resource の実装
- シンプルなパラメータ型定義
- 主に GET メソッドの利用
- エラーハンドリングはシンプル

### Tool の実装
- zod などを使用した詳細なスキーマ定義
- POST/PUT/DELETE メソッドの利用が多い
- より詳細なエラーハンドリングとバリデーション

詳細な実装パターンについては [リポジトリ概要](./01-repository-overview.md) の「FastMCPフレームワークと本リポジトリ」セクションを参照してください。