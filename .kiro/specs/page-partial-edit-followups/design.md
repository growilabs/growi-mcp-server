# Design Document

## Overview

PR #34 のレビュー結果に基づく追随作業の設計。うち 2 件（remark 採用・ページ読み取りツールの再編）はレビューを経た方針転換であり、残りは当初からの内部整理である。

**この spec は 1.8.0 の公開前に完了させることを前提に設計している。** PR #34 は未公開（npm latest は 1.7.0）なので、新しい 3 ツールの応答の形と、既存 3 ツールの応答軽量化は、まだ自由に変えられる。公開後に同じ整理をすると費用が上がる。

### Goals

- `getPageOutline` の出力を GROWI 本体の描画結果に一致させる（Requirement 1）
- CommonMark 準拠部分の保守を micromark に委ね、自前で持つ範囲を「自分たちの製品仕様」だけに絞る（Requirement 1）
- ページの読み方を名前で選び分けられるようにし、既存の `getPage` 利用者を壊さずに移行経路を作る（Requirement 2）
- アウトラインの意味論を `parse-outline` モジュールに閉じ込める（Requirement 3）
- 応答フィールドの意味を名前だけで判別できるようにする（Requirement 4）
- 到達しないコードと重複した判定・組み立てを除去する（Requirement 5・6）
- 振る舞いが変わった箇所をテスト差分から特定できる状態を作る（Requirement 7）

### Non-Goals

- **CI の整備はしない。** このリポジトリには CI チェックが 1 つも設定されていない（PR #34 の時点で `statusCheckRollup` が空）。本 spec より広い課題なので別途扱う。ただしその結果として、テストの差分管理（Requirement 7）が唯一の検出手段になることは設計に織り込む。
- **`getPageInfo` は変更しない。** 別の API（`getInfoForPage`）を呼んでおり、`pageId` しか受け付けない。ページのメタデータ取得の代替にはならないが、その整理は本 spec の範囲外とする。
- **`getPage` の意味を入れ替えない。** 1.7.0 で公開済みのため、別名として動作を維持する。
- **GROWI 独自記法（`$lsx()` 等のディレクティブ）への対応はしない。** 完全な一致には GROWI 本体のプラグイン群が必要で、それは publish されていない。本 spec が目指すのは標準 markdown の範囲での一致である。

## markdown 解析の実装方針

### 決定

**markdown のアウトライン解析を unified / remark（`remark-parse` + `remark-frontmatter`）に置き換える。**

### 前提: `@growi/core` は使えない

`@growi/core@2.3.2` の配布物を展開して確認した結果、**markdown を扱うユーティリティは 1 つも export されていない**。

| export | 中身 |
| --- | --- |
| `dist/utils` | `page-path-utils` / `path-utils` / `objectid-utils` / `escape-string-for-regex` / `template-checker` / `growi-theme-metadata` など |
| `dist/remark-plugins` | GROWI 独自ディレクティブの option-parser（`export *` が 2 行だけ） |
| `dist/models` / `dist/interfaces` / `dist/consts` / `dist/swr` | 型とモデル、SWR フック |

GROWI 本体の見出し抽出は `apps/app/src/services/renderer/` の `rehype-slug` + `rehype-toc` にあり、publish されていないため import できない。npm 上の他の `@growi/*` にも該当機能は無い。**したがって選択肢は「自前実装」か「remark」の二択である。**

### 採用の根拠 1: 保守コストは自前実装から消える側に集中している

`parse-outline.ts`（188 行）のうち remark が肩代わりできるのは 53 行で、残る 67 行と型定義は自前で保持する。行数は 12% しか減らない。**しかし保守コストは行数に比例しない。**

| | 内容 | 保守の性質 |
| --- | --- | --- |
| **消える 53 行** | フェンスの開閉判定（マーカー長・情報文字列のバッククォート規則・チルダとの区別）、frontmatter 検出、字下げコードや HTML ブロックとの相互作用 | **外部仕様（CommonMark）への追従。** 完全には実装しきれず、食い違いがそのまま潜在バグになる。実際に 5 パターン見つかった |
| **残る 67 行** | セクションの終了行、preamble の境界、見出し名からの範囲解決、文字数計上 | **自前の製品仕様。** 準拠すべき外部仕様が無く、自分たちのテストで挙動が完全に決まる |

`apply-string-edits.ts`（123 行）は純粋な文字列処理なので remark とは無関係で 1 行も減らない。つまり remark が買うのは**コード量ではなく、一番バグが出やすく直しても終わりが来ない部分の外注**である。

### 採用の根拠 2: 自前実装は GROWI 本体と 5 パターンで食い違う

同じ入力を両実装に通した実測結果。

| 入力 | 自前実装 | GROWI 本体（remark） |
| --- | --- | --- |
| setext 見出し（`Title` の下に `=====`） | 見出しゼロ、全体が preamble | `# Title` として検出 |
| `<div>` 直後の `# foo`（空行なし） | 見出しとして報告 | HTML ブロック内なので見出しではない |
| `---` の直後に `# A`、その後 `---` | `A` と `B` を報告 | frontmatter として読み捨て、`B` のみ |
| 入れ子リスト内の 4 スペース字下げ見出し | 検出しない | 検出する |
| `## **Bold** and \`code\`` | `**Bold** and \`code\``（生の記法） | `Bold and code`（描画後テキスト） |

### 受け入れるコスト（実測）

**解析速度**（1 回あたりの平均。`parse` + 見出し走査）

| 本文サイズ | 自前実装 | remark |
| --- | --- | --- |
| 1.5 KiB / 132 行 | 0.02 ms | 1.02 ms |
| 7.7 KiB / 652 行 | 0.05 ms | 5.01 ms |
| 63 KiB / 5,202 行 | 0.39 ms | 58.85 ms |

約 1 ms/KiB で自前実装の 100 倍以上だが、**これは同じ本文を GROWI から HTTP で取得する時間に埋もれる**。3 ツールはいずれもページ全体を取得してから解析するため、解析が律速になることはない。

**配布サイズと依存**

| 観点 | 実測 | 評価 |
| --- | --- | --- |
| 配布サイズ（gzip） | 730 KiB → 816 KiB（**+86 KiB / +12%**） | npx はバージョンごとに 1 回だけ取得。実害なし |
| 利用者側の install 依存 | **変わらない。** 公開 `dependencies` は `dotenv-flow` / `fastmcp` / `zod` の 3 つのまま。remark は ncc が `dist` に同梱するため、利用者側で解決されない | 増える約 70 パッケージが効くのは本リポジトリの開発時の lockfile だけ |
| 起動時間 | remark の読み込みが約 36 ms、ページツール登録時に一度だけ | 常駐プロセスなので無視できる |
| サプライチェーン | unified / micromark は JS 界で最も広く使われている系列で、**GROWI 本体が既に依存している** | 組織として新しいリスクを負わない |

`remark-gfm` は採用しない。見出しの検出結果は 1 パターンも変わらないのに、63 KiB のページで解析時間が 59 ms → 81 ms に増えるだけだった。

### 見出しテキストの二重返却

`text`（描画後）と `raw`（生の記法）の両方を返す。用途が分かれるためである。

- `text`: GROWI の目次と一致する。人間が画面で見た見出し名でそのまま照会できる
- `raw`: 見出し行そのものを `editPage` で書き換えるときに必要（`oldString` を組み立てられる）

```typescript
export interface OutlineEntry {
  level: number;
  /** 描画後のテキスト（GROWI の目次と一致）。mdast-util-to-string の結果 */
  text: string;
  /** 見出し行の生の記法（`#` マーカーと ATX 閉じ列を除いた部分） */
  raw: string;
  startLine: number;
  endLine: number;
  chars: number;
}
```

`resolveHeadingRange` は `text` と `raw` の**どちらでも**一致させる。照合順は「`text` の完全一致 → `raw` の完全一致 → `text` の大文字小文字を無視した一致 → `raw` の同様の一致」とし、最初に 1 件だけ見つかった段階で確定する。複数一致は現在と同じく曖昧として扱う。

`raw` は構文木からは得られないため、`startLine` の行を本文から取り出し、先頭の `#` マーカーと末尾の ATX 閉じ列（`## Title ##` の後ろの `##`）を除いて求める。setext 見出しの場合は下線行を含まない見出し本体の行をそのまま使う。

### `unterminatedFence` の廃止

このフラグは削除する。remark では未閉フェンスが「EOF まで続く `code` ノード」になるため、フラグを維持するには「最後のノードが `code` で終端行が最終行」といった判定を書き足すことになり、CommonMark 準拠の再実装に逆戻りする。

廃止しても整合する。未閉フェンス以降の見出しがアウトラインに現れないのは GROWI 本体と同じ挙動であり、本体もそのような警告は出さない。

### 実装上の注意: `unist-util-visit` の戻り値

`visit` のコールバックが数値を返すと、`unist-util-visit` はそれを「走査を続ける位置」の指示として解釈し、同じノードを重複訪問する。`out.push(...)` は配列長（数値）を返すため、次の書き方は見出しが重複する。

```typescript
// NG: push() の戻り値（数値）が visit に渡り、同じノードを重複訪問する
visit(tree, 'heading', (node) => out.push(toEntry(node)));

// OK: 波括弧で包んで undefined を返す
visit(tree, 'heading', (node) => {
  out.push(toEntry(node));
});
```

本 spec の調査中に実際に踏んだので、実装時とレビュー時に確認する。

### 将来 GROWI 本体が解析を publish したとき

`@growi/core` などから markdown 解析が publish されたら、remark を直接使うのをやめて本体の実装に寄せる。その差し替えを容易に保つため、`parseMarkdownOutline` は副作用のない純関数のままにし、呼び出し元を `getPageOutline/service.ts` と `getPageSection/service.ts` の 2 箇所に限る（現状の構造を維持する）。Requirement 3 のリファクタリングは、service 層に残ったアウトラインの意味論を消すことでこの差し替えやすさを高める。

## ページ読み取りツールの再編設計

### ツール構成

| ツール | 返すもの | 位置づけ |
| --- | --- | --- |
| `getPageOutline` | 見出しの構造（階層・行範囲・サイズ）。本文なし | ページを読む既定の入口 |
| `getPageSection` | 見出し名または行範囲で指定した部分の本文 | 必要な箇所だけ読む |
| `getPageWholeContents` | 全文（現在の `getPage` の働き） | 全文が必要なときに明示的に選ぶ |
| `getPage` | `getPageWholeContents` と同一の応答 ＋ 非推奨の案内 | **非推奨。** 2.0.0 で削除予定 |
| `getPageInfo` | 別 API（`getInfoForPage`）の要約情報 | 本 spec の対象外 |

`getPage` の意味は変えない。**意味を入れ替えると「エラーにならず違う内容が返る」という最も見つけにくい壊れ方になる**ため、別名として動作を維持し、案内で移行を促す方式を採る。

削除予定バージョンは 2.0.0（次のメジャー）と想定している。期限を決めない非推奨は永久に残るため、README に明記する。この想定は変更可能で、変えるなら README とツール説明文の 2 箇所を揃える。

### 非推奨の告知経路

MCP のツール定義には `deprecated` に相当する標準フィールドが無い。したがって告知は次の 2 経路に置く。

1. **ツール説明文（`description`）** — LLM がツールを**選ぶ前**に読む。呼び出し先を変えたいならこちらが主。非推奨であることと、代わりに使うべき 3 つのツール名を書く
2. **応答の中の案内** — LLM がツールを**呼んだ後**に読む。すでに `getPage` を呼ぶよう指示されている既存のスキルやプロンプトに届く

応答の案内はエラーと誤解されない形にする。LLM は警告文をそのまま利用者に転送して「何か失敗した」と伝えることがあるためである。

```typescript
// getPage の応答（getPageWholeContents の応答に案内を 1 つ足すだけ）
{
  ...wholeContentsResult,
  _notice: 'getPage is deprecated and will be removed in 2.0.0. Use getPageOutline (structure), getPageSection (partial read), or getPageWholeContents (full body).',
}
```

キー名を `_notice` とするのは、`error` や `warning` と違って失敗を示さないことを名前で表すためである。

### 実装の共有

`getPage` と `getPageWholeContents` は同一の処理を共有する。登録処理（例外処理を含む約 35 行）を複製してはならない。

```
src/tools/page/getPageWholeContents/
  index.ts
  schema.ts
  service.ts    ← 取得と応答整形（現 getPage/register.ts の中身を移す）
  register.ts   ← registerGetPageWholeContentsTool(server)
                  および registerGetPageTool(server)（同じ service を別名で登録し、_notice を付与）
```

`getPage` 用のディレクトリは削除し、登録関数だけを `getPageWholeContents/register.ts` に置く。`src/tools/page/index.ts` からは両方を登録する。ディレクトリを 2 つに分けると schema と service が二重管理になるためである。

### 到達しない例外分岐

現 `getPage/register.ts` に PR #34 で追加された `isGrowiApiError` 分岐は到達しない。この処理の中で `GrowiApiError` を投げるコードが無いためである（SDK は axios 由来の例外、`resolveAppName` は素の `Error` を投げ、応答整形は例外を投げない）。移設時に削除する（Requirement 5.2）。

## その他の修正の設計

### アウトライン整形の単一化（Requirement 3）

`maxDepth` の絞り込みを `parse-outline` 側に移す。`parseMarkdownOutline` に引数を足すのではなく、別関数として export する。

```typescript
export const filterOutlineByDepth = (
  parsed: MarkdownOutline,
  maxDepth: number,
  lines: readonly string[],
): MarkdownOutline & { hiddenHeadingCount?: number } => { /* ... */ };
```

引数を足す案を採らない理由は、`parseMarkdownOutline` の責務（本文を解析して構造を返す）と絞り込みの責務（できた構造を表示用に間引く）が別物であり、`getPageSection` は絞り込みを必要としないためである。引数方式だと使われない引数が残る。

これにより `getPageOutline/service.ts` から `charsOfLines`（`sliceChars` の複製）と preamble 再計算の約 20 行が消え、2 度目の行分割も無くなる。`sliceChars` は同一モジュール内から使うので export しない。

### editPage の応答フィールド分離（Requirement 4）

| フィールド | 意味 | dryRun | 通常実行 |
| --- | --- | --- | --- |
| `baseRevisionId` | 編集の土台にしたリビジョン | 返す | 返す |
| `newRevisionId` | 保存で生成されたリビジョン | 返さない | 返す（保存応答に無ければ省略） |

両方を常に同じ意味で返すことで、呼び出し側が `dryRun` を渡したかどうかを覚えている必要がなくなる。`baseRevisionId` を通常実行でも返すのは、競合が起きたときにどのリビジョンを土台にしたかが分かるようにするためである。

ツール説明文に「`dryRun` の応答の `baseRevisionId` をそのまま `expectedRevisionId` に渡せる」ことを追記する。

### 到達しないコードの除去（Requirement 5）

- `apply-string-edits.ts`: `findOccurrences` 内の空文字ガードを削除する。唯一の呼び出し元が直前で例外を投げるため到達しない。事実と合っていないコメントも一緒に消える
- `applyStringEdits` 側の例外送出は**残す**。公開関数であり、zod の `.min(1)` はツール経由の入力しか守らない
- 全文取得ツールの `isGrowiApiError` 分岐は削除（前述）
- `editPage` / `getPageOutline` / `getPageSection` の同分岐は**残す**（service が投げるため到達する）

### 共通化（Requirement 6）

- `src/commons/utils/require-page-id-or-path.ts` を追加し、`pageId` と `path` がともに未指定なら `UserError` を投げる関数を置く。新規 3 ツールの登録処理から呼ぶ。判定を登録層に置き続ける理由（fastmcp が `parameters` に素の `z.object` を要求し、top-level の `.refine()` が使えない）はその関数の JSDoc に移す
- `editPage/service.ts` に応答組み立て関数を 1 つ置き、dryRun・成功時・リトライ成功時の 3 箇所から呼ぶ。行数と文字数の算出もそこに集約する

## Requirements Traceability

| Requirement | 対象 | 設計節 |
| --- | --- | --- |
| 1 | `parse-outline.ts`, `parse-outline.test.ts`, `package.json` | markdown 解析の実装方針 |
| 2 | `getPageWholeContents/*`（新規）, `getPage/*`（削除）, `tools/page/index.ts`, `README.md`, `README_JP.md`, `skills/growi-mcp-setup/SKILL.md`（ツール数） | ページ読み取りツールの再編設計 |
| 3 | `parse-outline.ts`, `getPageOutline/service.ts` | アウトライン整形の単一化 |
| 4 | `editPage/service.ts`, `editPage/register.ts` | editPage の応答フィールド分離 |
| 5 | `apply-string-edits.ts`, `getPageWholeContents/register.ts` | 到達しないコードの除去 |
| 6 | `commons/utils/require-page-id-or-path.ts`（新規）, 新規 3 ツールの登録処理, `editPage/service.ts` | 共通化 |
| 7 | 全テストファイル | Testing Strategy |
| 8 | 調査のみ（`getPageInfo` の応答確認） | — |

## Testing Strategy

CI が無いため、テストの通過状況が唯一の検出手段である。Requirement 1 は多くの期待値を変えるので、**変わるテストを事前に確定させ、この一覧に無いテストが変更を要したら作業を止める**という運用にする。

### `parse-outline.test.ts`

| テスト | 扱い | 理由 |
| --- | --- | --- |
| フェンス内の見出し形を無視（バッククォート／チルダ／短いマーカーで閉じない） 3 件 | **変更なしで通る** | remark が同じ結果を出すことを実測で確認 |
| YAML frontmatter 内を無視 | 変更なしで通る | 同上 |
| `...` を frontmatter の終端として受ける | 変更なしで通る | 実測で見出しが同じ行に出ることを確認 |
| 閉じない `---` を frontmatter として扱わない | 変更なしで通る | 同上 |
| CRLF を許容 | 変更なしで通る | 実測で確認 |
| ATX 閉じ列の除去と 3 スペースまでの字下げ | **`raw` の期待値を追加** | 検出結果は同じ。`raw` フィールドが増えるため |
| セクション範囲・preamble・文字数・最終行の見出し・空本文 6 件 | 変更なしで通る | 自前の製品仕様のまま |
| 先頭の `---` の後に見出しがある場合 | **期待値を反転**（`['A','B']` → `['B']`） | GROWI 本体と一致させる（Requirement 1.7） |
| 未閉フェンスにフラグを立てる | **書き換え** | フラグの検証を削除し、見出しが現れないことだけを検証（Requirement 1.8） |
| 閉じたフェンスでフラグを立てない | **削除** | フラグ自体が無くなる |
| — | **新規: setext 見出しを検出する** | Requirement 1.5 |
| — | **新規: HTML ブロック内の見出し形を検出しない** | Requirement 1.6 |
| — | **新規: 入れ子リスト内の字下げ見出しを検出する** | Requirement 1（本体一致の帰結） |
| — | **新規: `text` は描画後・`raw` は生の記法** | Requirement 1.3 |
| — | **新規: `text` でも `raw` でも見出しを解決できる** | Requirement 1.4 |
| — | **新規: 空見出し（`#` のみ）の扱い** | Requirement 7.4。remark でも空テキストの見出しとして現れることを実測で確認済み |
| `resolveHeadingRange` 6 件 | 変更なしで通る | 自前ロジック。テスト本文に inline markup が無いため `text` の変化の影響を受けない |

### `getPageOutline/service.test.ts`

| テスト | 扱い |
| --- | --- |
| `unterminatedFence` を応答に伝える | **削除**（フラグ廃止） |
| 残り 4 件（アウトライン取得・`maxDepth` の絞り込み・preamble の再計算 2 件） | **変更なしで通る**（Requirement 3.4 の確認手段） |

### `editPage/service.test.ts`

`revisionId` を参照する 4 件（dryRun・成功・リトライ・リビジョン欠落）で **フィールド名を `baseRevisionId` / `newRevisionId` に追随**させる。残りは変更なし。加えて **新規 1 件**（前半が一致し後半が一致しない編集列で保存が試みられないこと。Requirement 7.3）。

### `getPageSection/service.test.ts`

全 8 件が変更なしで通る見込み。テスト本文に setext 見出しや inline markup を含まないため。

### `growi-page.test.ts`

応答整形関数そのもののテストは変更なしで通る。呼び出し元が `getPage` から `getPageWholeContents` に移るだけである。

### 新規テスト（Requirement 2・7.5）

- `getPageWholeContents` が全文を返す
- `getPage` が `getPageWholeContents` と同一の応答を返し、`_notice` を含む
- `_notice` の文言に代替 3 ツールの名前と削除予定バージョンが含まれる

### 完了条件

- `pnpm vitest run` が全件通る。テストの変更が上の一覧の範囲に収まっている
- `pnpm tsc --noEmit` がエラーなし
- `pnpm lint` の指摘が main の既存 6 件から増えていない（`aiTools/suggestPath` の 2 件、`.claude-plugin` の 2 件、`.kiro/settings/templates/specs/init.json`、`package.json` の CRLF。既存 6 件の解消は本 spec の対象外）
- `README.md` / `README_JP.md` のツール一覧が実際の登録内容と一致し、`getPage` の削除予定バージョンが書かれている
- `skills/growi-mcp-setup/SKILL.md` のツール数の記述が実際の数と一致している
