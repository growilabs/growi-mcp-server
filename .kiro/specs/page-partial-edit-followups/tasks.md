# Implementation Plan

PR #34（merge commit `399e8ba`）のレビューを経た追随作業。**1.8.0 の公開前に完了させることを前提にしている**（PR #34 は未公開なので、新ツールの応答の形を変えても誰も壊れない）。

`(P)` が付いたタスクは並行して進めてよい。タスク 1 と 2 は互いに独立しているが、どちらも README の更新を伴うので、README は最後にまとめて直すほうが衝突が少ない。

- [ ] 1. markdown 解析を remark に置き換える
- [ ] 1.1 依存を追加する
  - `remark-parse` / `remark-frontmatter` / `unified` / `mdast-util-to-string` / `unist-util-visit` を追加する
  - `remark-gfm` は**追加しない**（見出しの検出結果は変わらず、63 KiB のページで解析時間が 59 ms → 81 ms に増えるだけ）
  - 置き場所は `@growi/sdk-typescript` と `diff` に倣う。ncc が `dist` に同梱するため利用者側の install 依存は増えない
  - _Requirements: 1.1, 1.2_
- [ ] 1.2 見出しの検出を構文木ベースに差し替える
  - `parse-outline.ts` から `HEADING_PATTERN` / `FENCE_OPEN_PATTERN` / `FenceState` / `detectFrontmatterEnd` と走査ループ（計 53 行）を削除する
  - `unified().use(remarkParse).use(remarkFrontmatter, ['yaml'])` の構文木から `heading` ノードを集める
  - **`visit` のコールバックは必ず波括弧で包む。** `out.push(...)` の戻り値（配列長の数値）を返すと `unist-util-visit` が走査位置の指示と解釈し、同じノードを重複訪問する（調査中に実際に踏んだ）
  - セクションの終了行・preamble の境界・文字数の算出は自前のまま保持する（構文木からは得られない）
  - _Requirements: 1.1, 1.9_
- [ ] 1.3 見出しテキストを `text` と `raw` の 2 つ返す
  - `text` は `mdast-util-to-string` の結果（描画後テキスト。GROWI の目次と一致）
  - `raw` は見出し行の生の記法（`#` マーカーと ATX 閉じ列を除いた部分）。構文木からは得られないので `startLine` の行を本文から取り出して求める。setext 見出しは下線行を含まない本体行を使う
  - `OutlineEntry` に `raw` を追加する
  - _Requirements: 1.3_
- [ ] 1.4 `resolveHeadingRange` を `text` と `raw` の両方で照合する
  - 照合順は「`text` の完全一致 → `raw` の完全一致 → `text` の大文字小文字を無視した一致 → `raw` の同様の一致」。最初に 1 件だけ見つかった段階で確定する
  - 複数一致は現在と同じく曖昧（`ambiguous`）として扱う
  - _Requirements: 1.4_
- [ ] 1.5 `unterminatedFence` を廃止する
  - `MarkdownOutline` と `GetPageOutlineResult` からフィールドを削除する
  - remark では未閉フェンスが「EOF まで続く `code` ノード」になるため、フラグを維持すると CommonMark 準拠の再実装に逆戻りする。未閉フェンス以降の見出しが出ないことは GROWI 本体と同じ挙動であり、本体も警告を出さない
  - _Requirements: 1.8_
- [ ] 1.6 `parse-outline.test.ts` を design.md の一覧どおりに更新する
  - **期待値を反転** 1 件: 先頭の `---` の後に見出しがある場合（`['A','B']` → `['B']`）
  - **書き換え** 1 件: 未閉フェンスのテストからフラグの検証を外し、見出しが現れないことだけを検証
  - **削除** 1 件: 閉じたフェンスでフラグを立てないテスト
  - **`raw` の期待値を追加** 1 件: ATX 閉じ列と字下げのテスト
  - **新規 6 件**: setext 検出 / HTML ブロック内は見出しにしない / 入れ子リスト内の字下げ見出しを検出 / `text` と `raw` の違い / `text` でも `raw` でも解決できる / 空見出し（`#` のみ）の扱い
  - **この一覧に無いテストが変更を要したら作業を止める**（想定外の振る舞い変更のため）
  - _Requirements: 1.5, 1.6, 1.7, 7.1, 7.2, 7.4_
- [ ] 1.7 `getPageOutline/service.test.ts` の `unterminatedFence` テストを削除する (P)
  - 残る 4 件は変更なしで通ること（フラグ以外の契約が変わっていない証拠）を確認する
  - _Requirements: 1.8, 7.1_

- [ ] 2. ページ読み取りツールを再編する
- [ ] 2.1 `getPageWholeContents` を作る
  - `src/tools/page/getPageWholeContents/` に `index.ts` / `schema.ts` / `service.ts` / `register.ts` を置き、現 `getPage/register.ts` の処理を `service.ts` に移す
  - 移設時に到達しない `isGrowiApiError` 分岐を削除する（この処理内で `GrowiApiError` を投げるコードは無い）
  - `src/tools/page/getPage/` ディレクトリは削除する
  - _Requirements: 2.1, 5.2_
- [ ] 2.2 `getPage` を別名として登録する
  - `registerGetPageTool` を `getPageWholeContents/register.ts` に置き、**同じ service を共有**する。登録処理（例外処理を含む約 35 行）を複製しない
  - 応答は `getPageWholeContents` と同一に、`_notice` を 1 つ足すだけにする。キー名を `_notice` にするのは、`error` / `warning` と違って失敗を示さないことを名前で表すため（LLM が警告文を「失敗した」と利用者に転送するのを避ける）
  - 文言には代替 3 ツールの名前と削除予定バージョン（2.0.0）を含める
  - ツール説明文にも非推奨であることと代替を書く。LLM がツールを**選ぶ前**に読むのは説明文なので、こちらが主の経路になる（MCP のツール定義に `deprecated` の標準フィールドは無い）
  - **意味を入れ替えない。** `getPage` は全文を返し続ける
  - _Requirements: 2.2, 2.3, 2.4, 2.5_
- [ ] 2.3 `src/tools/page/index.ts` の登録を更新する
  - `registerGetPageWholeContentsTool` と `registerGetPageTool` の両方を登録する
  - 登録ツール数は 34 → 35 になる
  - _Requirements: 2.1, 2.2_
- [ ] 2.4 `getPageWholeContents` と `getPage` のテストを追加する (P)
  - `getPageWholeContents` が全文を返す
  - `getPage` が同一の応答を返し、`_notice` を含む
  - `_notice` に代替 3 ツール名と削除予定バージョンが含まれる
  - _Requirements: 7.5_

- [ ] 3. アウトライン整形ロジックを parse-outline に一本化する
- [ ] 3.1 `filterOutlineByDepth` を `parse-outline.ts` に追加する
  - シグネチャは `filterOutlineByDepth(parsed: MarkdownOutline, maxDepth: number, lines: readonly string[]): MarkdownOutline & { hiddenHeadingCount?: number }`
  - `parseMarkdownOutline` に引数を足す案は採らない。`getPageSection` は絞り込みを必要とせず、使われない引数が残るため
  - 絞り込み後の preamble 再計算（見出しが 0 件なら全体 / 最初の見出しが 1 行目でなければそこまで）をこの関数の内部に入れる
  - 既存の `sliceChars` を同一モジュール内から使う。export しない
  - _Requirements: 3.1, 3.2_
- [ ] 3.2 `getPageOutline/service.ts` から複製を削除する
  - `charsOfLines`（`sliceChars` と 1 文字も違わない複製）を削除する
  - `maxDepth` の絞り込みと preamble 再計算の約 20 行を `filterOutlineByDepth` の呼び出しに置き換える
  - 2 度目の行分割が無くなることを確認する
  - タスク 1.7 と同じテストファイルに触るため、1.7 の後に着手する
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 4. editPage の応答リビジョン ID を編集前・編集後で別名にする
  - `revisionId` を `baseRevisionId`（編集の土台にしたリビジョン）と `newRevisionId`（保存で生成されたリビジョン）に分ける
  - `baseRevisionId` は dryRun でも通常実行でも返す（競合時にどのリビジョンを土台にしたか分かるようにするため）。`newRevisionId` は通常実行のみで、保存応答にリビジョンが無ければ省略する（古い値を推測で返さない現在の挙動を維持）
  - ツール説明文に「dryRun の応答の `baseRevisionId` をそのまま `expectedRevisionId` に渡せる」ことを追記する
  - `editPage/service.test.ts` の該当 4 件（dryRun・成功・リトライ・リビジョン欠落）でフィールド名を追随させる
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 5. 到達しないコードを除去する (P)
  - `apply-string-edits.ts` の `findOccurrences` 内の空文字ガード（`if (needle.length === 0) return [];`）を削除する。唯一の呼び出し元が直前で例外を投げるため到達しない。事実と合っていないコメント（`reported as not-found by the caller`）も一緒に消える
  - `applyStringEdits` 側の空 `oldString` の例外送出は**残す**。公開関数であり、zod の `.min(1)` はツール経由の入力しか守らない
  - 全文取得ツールの `isGrowiApiError` 分岐はタスク 2.1 で削除する
  - `editPage` / `getPageOutline` / `getPageSection` の同分岐は**残す**（service が `GrowiApiError` を投げるため到達する）
  - _Requirements: 5.1, 5.3_

- [ ] 6. 重複した入力検証と応答組み立てを共通化する
- [ ] 6.1 `pageId` / `path` 必須判定を共通関数にする (P)
  - `src/commons/utils/require-page-id-or-path.ts` を追加し、両方未指定なら `UserError('Either pageId or path must be provided')` を投げる関数を置く
  - `editPage` / `getPageOutline` / `getPageSection` の登録処理から呼び出しに置き換える（現状 3 箇所に複製されている）
  - 判定を登録層に置き続ける理由（fastmcp が `parameters` に素の `z.object` を要求するため top-level の `.refine()` が使えない）をその関数の JSDoc に移す
  - _Requirements: 6.1, 6.3_
- [ ] 6.2 `editPage` の応答組み立てを 1 関数に集約する
  - dryRun・成功時・リトライ成功時の 3 箇所で手組みしている応答オブジェクトを 1 つの関数にまとめる
  - 行数と文字数の算出が 3 回書かれている状態を解消する
  - タスク 4 と同じファイルに触るため、4 の後に着手する
  - _Requirements: 6.2_

- [ ] 7. 「全部か無か」を service レベルで検証するテストを追加する (P)
  - `editPage/service.test.ts` に `edits: [一致する編集, 一致しない編集]` のケースを追加する
  - `EditMatchError` が投げられ、かつ保存が 1 度も試みられないことを検証する
  - 現状はユーティリティ単体で `editIndex` を検証しているだけで、「例外が飛ぶので保存されない」という実際の効果が service レベルで固定されていない
  - _Requirements: 7.3_

- [ ] 8. 権限情報をメタデータとして返す
- [ ] 8.1 `grantedUsers` の実体を応答に戻す
  - `trimPageForResponse` から `grantedUsers` の件数化を外し、実体を返す。`grantedUsersCount` は併記する
  - 要素がオブジェクトなら `toUserSummary` で `{ _id, username }` に縮小し、ID 文字列ならそのまま通す（SDK v3 の宣言は `grantedUsers?: string[]` だが、`@growi/core` の `IPage` は `Ref<IUser>[]` なので populate される可能性に備える）
  - `seenUsers` / `liker` は件数のみのまま維持する（閲覧のたびに際限なく増えるため性質が違う）
  - 件数化したままだと、グループ指定の権限（`grantedGroups`、PR #34 でも件数化されていない）は読めるのにユーザー指定の権限だけ読めないという不整合が残る
  - `growi-page.test.ts` に新規 2 件（`grantedUsers` の実体と件数が両方返る／`seenUsers` と `liker` は件数のみ）。既存 9 件は変更なしで通る
  - _Requirements: 8.1, 8.2, 8.3, 8.4_
- [ ] 8.2 `getPageOutline` の応答にページのメタデータを含める
  - 本文を除いた同じ整形処理（`trimPageForResponse(page, { keepBody: false })` 相当）を通し、`parent`・`grant`・`grantedUsers`・タグ等を返す
  - 含めないと「`parent` や `grant` だけ知りたいのに全文取得ツールを呼ぶ」しかなくなり、本 spec が削ろうとしているトークンの無駄が残る
  - `fetchPageBodyInfo` がすでにページ文書全体を取得しているので、**API 呼び出しを増やしてはならない**。整形の対象を増やすだけにする
  - `getPageOutline/service.test.ts` に新規 1 件（メタデータが含まれる）。既存 4 件は `toMatchObject` なのでフィールドが増えても通る
  - タスク 3.2 と同じファイルに触るため、3.2 の後に着手する
  - _Requirements: 8.5, 8.6_

- [ ] 9. ドキュメントを更新する
  - `README.md` / `README_JP.md` のページ管理セクションに `getPageWholeContents` を追加し、`getPage` を非推奨（2.0.0 で削除予定）と明記する
  - `getPageOutline` の説明に、ATX 見出しに加えて setext 見出しも検出することを書く（remark 採用の結果）
  - `skills/growi-mcp-setup/SKILL.md` のツール数を 34 → 35 に更新する
  - タスク 1・2 の両方が README に触るため、最後にまとめて行う
  - _Requirements: 2.6_

## 完了条件

- `pnpm vitest run` が全件通り、テストの変更が design.md「Testing Strategy」の一覧の範囲に収まっている
- `pnpm tsc --noEmit` がエラーなし
- `pnpm lint` の指摘が main の既存 6 件から増えていない（既存 6 件の解消は本 spec の対象外）
- `README.md` / `README_JP.md` のツール一覧が実際の登録内容（35 ツール）と一致し、`getPage` の削除予定バージョンが書かれている
- `skills/growi-mcp-setup/SKILL.md` のツール数が実際の数と一致している

## 対象外

- **CI の整備**（このリポジトリには CI チェックが 1 つも無い。本 spec より広い課題。ただしその結果としてテスト差分の管理が唯一の検出手段になることは Requirement 7 に織り込んである）
- **`getPageInfo` の変更**（別 API `getInfoForPage` を呼んでおり、ページのメタデータ取得の代替にはならないが、その整理は範囲外）
- **`getPage` の意味の入れ替え**（1.7.0 で公開済みのため、別名として動作を維持する）
- **GROWI 独自記法（`$lsx()` 等のディレクティブ）への対応**（完全一致には GROWI 本体のプラグイン群が必要で、publish されていない）
