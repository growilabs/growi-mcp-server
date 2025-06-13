# GROWI MCPサーバーの概要

## 参考URL
- MCP公式ドキュメント: https://modelcontextprotocol.io/introduction
- FastMCP: https://github.com/punkpeye/fastmcp
- GROWI SDK: https://github.com/growilabs/growi-sdk-typescript

## 1. リポジトリ構造の分析

### プロジェクト構造
```
src/
├── commons/          # 共通機能やユーティリティ
│   ├── api/         # GROWI APIクライアント実装
│   │   ├── client-v1.ts
│   │   ├── client-v3.ts
│   │   └── growi-api-error.ts
├── config/          # アプリケーション設定
│   ├── default.ts
│   └── types.ts
├── prompts/         # AIモデル用プロンプトテンプレート
│   ├── index.ts
│   └── summarizePagePrompt.ts
├── resources/       # MCPリソース実装
│   ├── ancestorsChildren/
│   ├── externalAccounts/
│   ├── me/
│   ├── page/
│   ├── tag/
│   └── index.ts
├── tools/          # MCPツール実装
│   ├── page/      # ページ関連操作ツール
│   │   ├── createPage/
│   │   ├── deletePages/
│   │   ├── renamePage/
│   │   ├── updatePage/
│   │   └── index.ts
│   ├── user/      # ユーザー関連操作ツール
│   │   ├── registerUser/
│   │   └── index.ts
│   └── index.ts
└── index.ts        # アプリケーションエントリーポイント

docs/                  # ドキュメント
├── guidelines/     # 開発ガイドライン
└── plan/           # 実装計画

scripts/          # ユーティリティスクリプト
```

### 主要ディレクトリの役割

#### src/commons/
- GROWI APIとの通信を実装する共通機能を提供
- v1およびv3のAPIバージョンに対応したクライアント実装
- 統一的なエラーハンドリング機能（GrowiApiError）の提供
- API通信時の型安全性とエラー処理の一貫性を確保

#### src/config/
- アプリケーションの設定管理を担当
- デフォルト設定の定義（default.ts）
- 設定項目の型定義（types.ts）によるタイプセーフな設定管理
- 環境変数との連携を管理

#### src/prompts/
AIモデルとの対話に必要なプロンプトテンプレートを管理するディレクトリ：
- 再利用可能なプロンプトテンプレートの定義
- プロンプト引数のバリデーションと型安全性の確保
- プロンプトの動的生成機能の提供
- 具体例：summarizePagePrompt.ts
  - ページ内容の要約生成
  - 要約の長さ（short/medium/long）の制御
  - 構造化された引数定義による型安全性の確保

#### src/resources/
MCPリソースの実装を含むディレクトリで、各リソースは以下の標準構造で実装：
- index.ts: リソースのエントリーポイントと型定義
- register.ts: MCPサーバーへのリソース登録ロジック
- service.ts: 実際のビジネスロジックの実装

具体例（page/service.ts）：
- GROWIのAPIとの通信処理
- エラーハンドリングの統一的な実装
- レスポンスの型安全性の確保
- 明確なインターフェース定義

#### src/tools/
MCPツールの実装を含むディレクトリで、各ツールは以下の構造で実装：
- schema.ts: 入力パラメータの検証スキーマ
- service.ts: ツールの実際の処理ロジック
- register.ts: MCPサーバーへのツール登録処理

具体例（createPage/service.ts）：
- GROWIのAPIを利用したページ作成機能
- パラメータのバリデーション
- 統一的なエラーハンドリング
- 型安全な実装

## 2. FastMCPフレームワークと本リポジトリ

### FastMCPフレームワークの概要
FastMCPは、MCPサーバーの実装を容易にするTypeScriptベースのフレームワークで、以下の特徴を持ちます：

- TypeScriptによる型安全性の確保
- 標準化されたツール・リソース定義
- セッション管理機能
- エラーハンドリングの統一化
- HTTPストリーミングとSSEのサポート
- CORSサポート（デフォルトで有効）
- ヘルスチェックエンドポイントの提供

### 本リポジトリでのFastMCPの活用

本リポジトリでは、FastMCPを以下のように活用しています：

1. リソース実装（src/resources/）
   - FastMCPのリソース定義機能を使用
   - 標準化されたインターフェースによるデータアクセス
   - register.tsによる明示的なリソース登録
   - service.tsでの具体的なビジネスロジックの実装
   - 統一的なエラーハンドリング

2. ツール実装（src/tools/）
   - FastMCPのツール定義機能を使用
   - スキーマベースの入力バリデーション
   - 型安全な実装
   - エラーハンドリングの統一化

3. プロンプト管理（src/prompts/）
   - FastMCPのプロンプト定義機能を活用
   - 引数の型チェックと検証
   - 動的なプロンプト生成
   - 再利用可能なテンプレート管理

4. エラーハンドリング（全体）
   - GrowiApiErrorクラスによる統一的なエラー処理
   - エラー情報の構造化
   - APIレスポンスの適切な型変換

これらの実装により、GROWIはLLMとの効率的な統合を実現し、型安全でメンテナンス性の高いコードベースを維持しながら、AIを活用した機能を提供しています。