# GROWI SDK メソッドの探索・目的のメソッドの特定手順

## 1. 型定義ファイルの場所を特定

1. パッケージのimport文を確認
   ```typescript
   import apiv3 from '@growi/sdk-typescript/v3';
   ```

2. `node_modules`内のパッケージディレクトリを探す
   ```bash
   # package.jsonでパッケージ情報を確認
   cat package.json | grep @growi/sdk-typescript
   # バージョンやインストール場所を確認できる

   # node_modules配下のパッケージの構造を確認
   ls node_modules/@growi/sdk-typescript/

   # package.jsonでパッケージ情報を確認
   ls node_modules/@growi/sdk-typescript/package.json
   ```

3. ディレクトリ構造の詳細を確認
   ```bash
   # 必要ならディレクトリ構造を確認
   ls -R node_modules/@growi/sdk-typescript/

   # 型定義ファイルの場所を特定
   find node_modules/@growi/sdk-typescript/ -name "index.d.ts"
   
   # 以下のような構造が見える
   ./dist/apiv3/index.d.ts          # メソッドのエクスポート定義
   ./dist/generated/v3/index.schemas.d.ts  # 型定義
   ```

4. 型定義ファイルを特定
   - TypeScriptの型定義は通常 `.d.ts` ファイルに格納
   - `dist/`配下を優先的に確認（ビルド済みファイル）
   - `src/`は参考用（必要に応じて確認）

## 2. メソッドの探索

1. APIエンドポイントのパス構造を確認
   ```
   例：/page/exist
   ↓
   get + Page + Exist
   のような命名パターンを予測
   ```

2. VSCodeで型定義ファイルを開く
   ```typescript
   // dist/apiv3/index.d.ts を開く
   ```

3. メソッドを検索
   - Ctrl+F でキーワード検索（例：`page`）
   - 見つかったメソッドのシグネチャを確認

## 3. メソッドの確認

1. シグネチャを確認
   ```typescript
   // 例
   getExistForPage: (params: GetExistForPageParams, options?) => Promise<GetExistForPage200>
   ```

2. パラメータとレスポンスの型を確認
   ```typescript
   // dist/generated/v3/index.schemas.d.ts で型定義を確認
   export type GetExistForPageParams = {
     path: string;
   };
   ```

3. 必要な型のimportパスを特定
   ```typescript
   import type { GetExistForPageParams, GetExistForPage200 } from '@growi/sdk-typescript/v3';
   ```

## 4. トラブルシューティング

見つからない場合の対処：

1. 命名パターンの確認
   - get/post/put/delete + リソース名
   - 複数形の可能性（List/Lists）
   - 前置詞の有無（ForPage/Page）

2. 関連する型から逆引き
   - パラメータ型（XXXParams）
   - レスポンス型（XXX200/XXX201）
   - リソース型（Page/User等）

3. APIドキュメントとの照合
   - エンドポイントのパスと一致するメソッドを探す
   - HTTPメソッドとの対応を確認

## 5. ベストプラクティス

1. エディタ機能の活用
   - F12: 定義へジャンプ
   - Ctrl+F: ファイル内検索
   - Ctrl+Shift+F: プロジェクト全体検索

2. 型定義の活用
   - まずindex.d.tsでメソッドを特定
   - 次にindex.schemas.d.tsで型を確認
   - 必要な型をimport