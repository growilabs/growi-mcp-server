# MCP Tools 実行計画

- 以下の GROWI API に対応するツールを実装する
- GROWI API 仕様は、[Open API - GROWI API v1](../openapi/openapi-v1.json) 及び [Open API - GROWI API v3](../openapi/openapi-v3.json) にある


## 優先度A（コア機能）

### ページ関連
- /page (GET/POST/PUT) - ページの取得・作成・更新
- /page-listing/root (GET) - ルートページ一覧
- /page-listing/ancestors-children (GET) - 階層構造を持つページ一覧
- /pages/rename (POST) - ページの名前変更
- /pages/delete (POST) - ページの削除
- /pages.getPageTag (GET) - ページのタグ取得
- /revisions/list (GET) - リビジョン一覧
- /revisions/{id} (GET) - 特定リビジョンの取得

### 検索機能
- /search (GET) - ページ検索
- /search/indices (GET) - インデックス状態確認
### 認証・ユーザー関連
- /login (POST) - ログイン
- /register (POST) - ユーザー登録
- /personal-setting (GET/PUT) - 個人設定の取得・更新

## 優先度B（重要な補助機能）
### ユーザー管理
#### v1
- /users.list - ユーザー一覧取得
- /users/usernames - ユーザー名一覧取得
- /users/update.imageUrlCache - ユーザー画像更新
#### v3
- /users/{id}/grant-admin (PUT) - 管理者権限付与
- /users/{id}/activate (PUT) - ユーザー有効化
- /users/{id}/deactivate (PUT) - ユーザー無効化
### グループ管理
- /user-groups (GET/POST) - ユーザーグループ操作
- /user-groups/{id} (GET/PUT/DELETE) - 個別グループ操作
- /external-user-groups (GET) - 外部ユーザーグループ
- /external-user-groups/{id} (GET/PUT/DELETE) - 外部グループ操作
### コンテンツ共有
- /share-links (GET/POST/DELETE) - 共有リンク操作
- /attachment (POST) - 添付ファイルのアップロード
- /attachment/{id} (GET) - 添付ファイルの取得
### コメント機能
- /comments.add (POST) - コメント追加
- /comments.get (GET) - コメント取得
- /comments.update (POST) - コメント更新
- /comments.remove (POST) - コメント削除

## 優先度C（その他の機能）
### 検索管理機能
- /search/indices (PUT) - インデックス再構築
- /search/connection (POST) - 検索サービス接続確認