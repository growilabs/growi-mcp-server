# API 実装タスクリスト

このドキュメントは、GROWI API の MCP 実装におけるタスク管理リストです。
LLM Agent が利用することを想定し、各APIの優先度、進捗、種別を管理します。

## 優先度 高 (改修)

### `tools/page/createPage` の改修

- **進捗状況:** GROWI SDK 利用方式で再実装完了
- **種別:** tool
- **処理フロー**
  1. apiV3 で GET `/page/exist` に成功
  2. POST `/page`

---
### `tools/page/renamePage` の改修

- **進捗状況:** GROWI SDK 利用方式で再実装完了
- **種別:** tool
- **処理フロー**
  1. apiV3 で GET `/pages/exist-paths` に成功
  2. POST `/pages/rename`
- **備考:**
  - スキーマの必須パラメータ更新（revisionIdを必須に）
  - 他にもリクエストパラメータがたくさんあるので正確な仕様を確認し対応する

---
### `tools/page/deletePages` の改修
- **進捗状況:** GROWI SDK 利用方式で再実装完了
- **種別:** tool
- **備考:** 1ページ削除なら apiv1 で POST `/pages.remove`、複数ページ削除なら apiv3 で POST `/pages/delete`


### `/page/info` (apiV3 GET)
- **進捗状況:** GROWI SDK 利用方式で再実装完了
- **種別:** resource
- **備考:** ページ情報取得のための基本的なAPI。PageParamsスキーマの定義確認が必要


## 優先度 高 (新規実装)

---

### `/pages/list` (apiV3 GET)
- **進捗状況:** GROWI SDK 利用方式で実装完了
- **種別:** resource
- **備考:** ページ一覧取得API。path検索、ページネーション機能あり。User情報を含むページ情報を返却

---

### `/pages/duplicate`
- **進捗状況:** GROWI SDK 利用方式で実装完了
- **種別:** tool
- **備考:** ページ複製API。再帰的な複製やユーザー関連リソースのみの複製など、複雑な操作をサポート
- **処理フロー**
  1. apiV3 で GET `/pages/exist-paths` に成功
  2. apiV3 で POST `/pages/duplicate`

---

### `/search` (apiV1 GET)
- **進捗状況:** GROWI SDK 利用方式で実装完了
- **種別:** tool
- **備考:** ページ検索API。Elasticsearchを使用し、ページネーション機能あり

---



## 優先度 中


### `/{pageId}/publish` (apiV3 PUT)
- **進捗状況:** GROWI SDK 利用方式で実装完了
- **種別:** tool
- **備考:** ページを公開状態に変更するAPI。ページの状態を直接変更する操作

---

### `/{pageId}/unpublish` (apiV3 PUT)
- **進捗状況:** GROWI SDK 利用方式で実装完了
- **種別:** tool
- **備考:** ページを非公開状態に変更するAPI。ページの状態を直接変更する操作

---

### `/pages/recent` (apiV3 GET)
- **進捗状況:** GROWI SDK 利用方式で実装完了
- **種別:** resource
- **備考:** 最近更新されたページ一覧取得API。ページネーションとWIPページの制御パラメータあり

---

### `/page-listing/root` (apiV3 GET)
- **進捗状況:** GROWI SDK 利用方式で実装完了
- **種別:** resource
- **備考:** ルートページ情報取得API。セキュリティ要件（api_key）あり

---

### `/page-listing/children` (apiV3 GET)
- **進捗状況:** GROWI SDK 利用方式で実装完了
- **種別:** resource
- **備考:** 指定ページの子ページ一覧取得API。idまたはpathパラメータによる指定が可能

---

### `/comments.get` (apiV1 GET)
- **進捗状況:** GROWI SDK 利用方式で実装完了
- **種別:** resource
- **備考:** ページのリビジョンに対するコメント取得API。page_idとrevision_idによる指定が可能

---

### `/{id}/recent` (apiV3 GET)
- **進捗状況:** GROWI SDK 利用方式で実装完了
- **種別:** resource
- **備考:** 特定ユーザーの最近作成したページ一覧取得API。ページネーション機能あり（PaginateResult）

---

### `/revisions/list` (apiV3 GET)
- **進捗状況:** GROWI SDK 利用方式で実装完了
- **種別:** tool
- **備考:** ページのリビジョン一覧取得API。ページネーション機能あり、totalCountとoffset情報も返却

---

### `/revisions/{id}` (apiV3 GET)
- **進捗状況:** GROWI SDK 利用方式で実装完了
- **種別:** resource
- **備考:** 指定したリビジョンの詳細情報取得API。pageIdとrevisionIdの両方が必要

---

### `/page-listing/info` (apiV3 GET)
- **進捗状況:** GROWI SDK 利用方式で実装完了
- **種別:** tool
- **備考:** 複数ページのサマリ情報を得るための API

---

### `/pages.getPageTag` (apiV1 GET)
- **進捗状況:** GROWI SDK 利用方式で実装完了
- **種別:** resource
- **備考:** ページのタグ取得API。pageId の指定が必要

---

### `/tags.search` (apiV1 GET)
- **進捗状況:** GROWI SDK 利用方式で実装完了
- **種別:** resource
- **備考:** タグ検索API。キーワードによるシンプルな検索機能

---

### `/tags.update` (apiV1 POST)
- **進捗状況:** GROWI SDK 利用方式で実装完了
- **種別:** tool
- **備考:** タグ更新API。pageId, revisionId, tagsの指定が必要

---

### `/tags.list` (apiV1 GET)
- **進捗状況:** 未着手
- **種別:** resource
- **備考:** タグ一覧取得API。ページネーション機能あり

---

### `/share-links` (apiV3 GET)
- **進捗状況:** 未着手
- **種別:** resource
- **備考:** 特定ページの共有リンク一覧取得API。セキュリティ要件（cookieAuth）あり

---

### `/share-links` (apiV3 POST)
- **進捗状況:** 未着手
- **種別:** tool
- **備考:** 共有リンク作成API。有効期限と説明を設定可能。セキュリティ要件（cookieAuth）あり

---

### `/share-links` (apiV3 DELETE)
- **進捗状況:** 未着手
- **種別:** tool
- **備考:** ページに関連する全共有リンク削除API。セキュリティ要件（cookieAuth）あり

---

### `/share-links/{id}` (apiV3 DELETE)
- **進捗状況:** 未着手
- **種別:** tool
- **備考:** 特定の共有リンク削除API。セキュリティ要件（cookieAuth）あり


## 優先度 低

### `/page/exist` (apiV3 GET)
- **優先度:** 中
- **進捗状況:** 未着手
- **種別:** resource
- **備考:** ページの存在確認のためのシンプルなAPI

---

### `/users/list` (apiV3 GET)
- **進捗状況:** 未着手
- **種別:** resource
- **備考:** ユーザー一覧取得API。指定したユーザーIDのリストに基づいてユーザー情報を返却

---

### `/users/usernames` (apiV3 GET)
- **進捗状況:** 未着手
- **種別:** resource
- **備考:** ユーザー名一覧取得API。検索、ページネーション機能あり。アクティブ/非アクティブユーザーなど複数種類のユーザー情報を返却

---

### `/page/grant-data` (apiV3 GET)
- **進捗状況:** 未着手
- **種別:** resource
- **備考:** ページの権限データ取得用API。シンプルな構造でisGrantNormalizedのみを返す

---

### `/{pageId}/grant` (apiV3 PUT)
- **進捗状況:** 未着手
- **種別:** tool
- **備考:** ページ権限の更新API。複雑なパラメータ構造とセキュリティ要件を持つ

---

### `/external-user-groups` (apiV3 GET)
- **進捗状況:** 未着手
- **種別:** resource
- **備考:** userGroupsのスキーマ定義がOpenAPIに不足。実装時に要確認・定義

---
### `/external-user-groups/ancestors` (apiV3 GET)
- **進捗状況:** 未着手
- **種別:** resource
- **備考:** ancestorUserGroupsのスキーマ定義とページネーション機能がOpenAPIに不足。実装時に要確認・定義

---
