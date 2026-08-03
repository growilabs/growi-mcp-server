# Research & Design Decisions

## Summary

- **Feature**: `release-flow-changesets`
- **Discovery Scope**: Extension（既存リポジトリへのリリース基盤の追加。外部サービスとの結合があるため依存の版と成立条件を実機・上流コードで確認した）
- **Key Findings**:
  - `changesets/action` の安定版は **v1.9.0** で、v2.0.0 は prerelease（`v2.0.0-next.3`）しかない。v1 と v2 で入力名が違う（`version` / `publish` → `version-script` / `publish-script`）ため、v1 の名前で書く。
  - v1 の action は version スクリプト実行後に `git add .` で**作業ツリー全体をコミット**する。したがって版上げ時に別のファイル（各 manifest）を書き換えても、その差分は Release PR に載る。
  - npm 公開は長期トークンなしで成立する。姉妹リポジトリ growi-sdk-typescript が `NPM_TOKEN` を持たず `id-token: write` だけで公開しており、`@growi/sdk-typescript@1.13.0` に provenance が付いていることを確認した。
  - Gemini CLI 拡張は現状 MCP サーバーが起動しない。原因は「Release に添付ファイルが無い → ソース tarball が使われる → `dist/` が無い」の 3 段で、manifest が `${extensionPath}/dist/index.js` を指しているため。
  - Gemini CLI の更新検知は Release tag の比較で行われ、manifest の `version` は画面表示専用。ただし上流ドキュメントが tag との一致を求めている。

## Research Log

### changesets/action のバージョン選択

- **Context**: 姉妹リポジトリ growi-sdk-typescript は `changesets/action@v1` を使っている。新規に書くなら v2 が適切かを確認する必要があった。
- **Sources Consulted**: `changesets/action` の Release 一覧、`README.md`（main / `maintenance/v1` の両方）、npm の `@changesets/cli` dist-tags
- **Findings**:
  - Release 一覧では `v1.9.0` が Latest。`v2.0.0-next.0`〜`next.3` は Pre-release。
  - main ブランチの README は「これは Changesets v3 対応の v2 開発ブランチ」と明記している。`@changesets/cli` の npm dist-tags も `latest: 2.31.1` / `next: 3.0.0-next.10` で、v3 は未 GA。
  - v1 の入力は `publish` / `version` / `commit` / `title` / `createGithubReleases`（既定 true）/ `commitMode` / `prDraft`。v2 では `publish-script` / `version-script` / `commit-message` / `pr-title` に改名されている。
  - v2 の README には「trusted publishing を使う場合は publish 権限を絞るため個別のサブアクションを推奨」とある。v1 にサブアクションは無い（`pr-status` / `pr-comment` のみ）。
- **Implications**: `changesets/action@v1` + `@changesets/cli@^2.31.1` を採用する。v1 の入力名で書く。v2 系への移行は「v2 と Changesets v3 が GA になったとき」の再検証事項とする。

### version スクリプトの変更がコミットされるか

- **Context**: バージョン同期を版上げ時に走らせる設計にするなら、その書き換えが Release PR に載らないと意味がない。
- **Sources Consulted**: `changesets/action` の `src/git.ts`（`maintenance/v1`）
- **Findings**: コミット処理は `git add .` → `git commit -m <message>` の 2 段で、対象を package.json と CHANGELOG.md に限定していない。
- **Implications**: `release:version` スクリプトの中で manifest を書き換えれば、Release PR の差分に含まれる。同期のための追加ワークフローや追加コミットは不要。

### npm 公開の認証方式（Trusted Publishing）

- **Context**: 長期有効な公開トークンをリポジトリに置かない方式が本当に成立するかを、推測ではなく実績で確かめる必要があった。
- **Sources Consulted**: growi-sdk-typescript の `.github/workflows/release-sdk.yml` とその git 履歴、同リポジトリの Actions 実行履歴、npm レジストリの attestation 情報
- **Findings**:
  - ワークフローには `NPM_TOKEN` が無く、`permissions` に `id-token: write` がある。履歴には「remove NPM_TOKEN from release workflow and documentation」というコミットが残っている。
  - `setup-node` に `registry-url` の指定は無く、`node-version: '24'`。
  - 直近の実行はすべて success で、2026-08-03 に 1.13.0 が公開されている。
  - `npm view @growi/sdk-typescript@1.13.0 dist.attestations` が provenance（`https://slsa.dev/provenance/v1`）を返す。
- **Implications**: 同じ構成（`id-token: write` + Node 24 + `changeset publish`）を踏襲する。provenance のための追加フラグは不要。ただし npm 側で対象パッケージに Trusted Publisher を登録する作業は人間が行う必要があり、**登録するワークフローのファイル名が一致していなければ公開は失敗する**ため、ファイル名を設計で固定する。

### Gemini CLI 拡張の取得経路

- **Context**: `gemini-extension.json` の起動コマンドが `${extensionPath}/dist/index.js` を指す一方、`dist/` は git 管理外である。実際に動くのかを確認する必要があった。
- **Sources Consulted**: `google-gemini/gemini-cli` の `docs/extensions/releasing.md`、`packages/cli/src/config/extensions/github.ts`、`packages/cli/src/config/extension-manager.ts`。growi-mcp-server の Release の添付ファイル一覧と `dist` の git 履歴
- **Findings**:
  - GitHub URL からのインストールはまず Release を参照する（`downloadFromGitHubRelease`）。カスタム添付ファイルが見つからない場合は `releaseData.tarball_url`（tag の自動生成ソース tarball）にフォールバックし、展開に成功すれば `success: true` を返す。
  - git clone にフォールバックするのは「Release が存在しない」か「利用者が同意した」場合だけで、添付ファイルが無いだけならソース tarball 経路で成立してしまう。
  - growi-mcp-server の Release v1.7.0 の `assets` は空。`git log --all -- dist` は空で、`dist/` は一度もコミットされていない。
  - 更新検知は `github-release` 種別では Release tag の比較で行われる。manifest の `version` は表示のみに使われるが、上流ドキュメントは tag と揃えることを求めている。
  - 添付ファイルを使う場合、アーカイブは自己完結していて `gemini-extension.json` がルートに来る必要がある。プラットフォーム非依存なら generic な 1 ファイルでよい。
- **Implications**: 現状は「インストールは成功扱いなのに MCP サーバーだけ起動しない」という壊れ方をしている。修復方法は 2 案あり、下記の決定で案B を採る。

### 既存リポジトリの慣習

- **Context**: 追加するスクリプトとコマンドを既存の書き方に合わせる。
- **Sources Consulted**: `package.json` の scripts、`scripts/growi-healthchecker.ts`、`node_modules/.bin/biome --version`、README の見出し構成
- **Findings**:
  - 単体スクリプトは `tsx scripts/<name>.ts` の形で実行している（`predev:cli`）。
  - Biome は 1.9.4。`biome format` の `--fix` は `--write` の別名で、どちらでも動く。
  - README は英語版・日本語版の 2 本立てで、`### Contributing`（日本語版は `### コントリビューション`）に開発者向けの規約が置かれている。
  - `files` は `["dist", "README.md", "LICENSE"]` で `CHANGELOG.md` を含まない。
- **Implications**: 同期スクリプトは `scripts/` 配下に置き `tsx` で実行する。文書は既存の Contributing 節に追加する。`files` に `CHANGELOG.md` を足す。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 版上げ手順に同期を組み込む | `release:version` の中で manifest を書き換える | 追加のワークフローが不要。差分が Release PR に載るので人間が確認できる | 版上げ経路を通らない手編集は防げない | 検査コマンドを併設して補う。**採用** |
| 独立したワークフローで同期 | 版上げ後に別ジョブが manifest を直してコミットする | 版上げ手順に手を入れない | コミットが 2 回に分かれ、Release PR の差分が不完全な瞬間が生じる | 却下 |
| 同期しない（手運用のまま） | 各 manifest を人間が上げる | 実装ゼロ | 現に 2 か所が放置されている（1.2.0 / 1.0.0） | 却下 |

## Design Decisions

### Decision: `changesets/action@v1` と `@changesets/cli@^2.31.1` を採用する

- **Context**: v2 系の存在を確認したうえで、どちらで書くかを決める必要があった。
- **Alternatives Considered**:
  1. `changesets/action@v2` + `@changesets/cli@3.x` — 新しい入力名、trusted publishing 向けのサブアクションが使える
  2. `changesets/action@v1` + `@changesets/cli@2.x` — 姉妹リポジトリと同じ構成
- **Selected Approach**: 案 2。
- **Rationale**: v2 も Changesets v3 も prerelease しか無く、リリース基盤を prerelease に載せると壊れたときの切り分けが難しくなる。姉妹リポジトリで同じ構成が動いていることは、失敗時に比較対象があるという運用上の利点でもある。
- **Trade-offs**: trusted publishing のために publish 権限を絞る（サブアクション分割）ことは v1 ではできず、ジョブ単位の権限で運用する。
- **Follow-up**: v2 と Changesets v3 の GA を再検証の契機とする。

### Decision: Gemini CLI 拡張は npm 経由で起動する（案B）

- **Context**: 拡張から MCP サーバーが起動しない状態を直す必要がある。
- **Alternatives Considered**:
  1. 案A — ビルド成果物を含む自己完結アーカイブを Release に添付する
  2. 案B — 起動コマンドを `npx -y @growi/mcp-server@<version>` に変え、`${extensionPath}/dist` への依存をやめる
- **Selected Approach**: 案B。バージョンは同期スクリプトが固定する。
- **Rationale**: 本 spec の目的はリリース作業の手数と取りこぼしを減らすことにある。案A はリリースごとにアーカイブの作成・命名規約・添付という管理対象を増やし、その構造（manifest がアーカイブのルートに来る）を将来も維持する責務を負う。案B は配布の実体を npm 1 本に集約でき、README が案内する Claude Code 向け設定も既に `npx @growi/mcp-server` である。
- **Trade-offs**: 初回起動が npm からの取得を伴うため遅く、オフラインでは動かない。これは要件から明示的に外した。
- **Follow-up**: バージョンを固定するため、npm 公開が Release 作成より先に起きる順序を維持する必要がある（action は publish 成功後に tag と Release を作るので既定で満たされる）。

### Decision: すべての manifest のバージョンを `package.json` に揃える（案a）

- **Context**: `.claude-plugin/plugin.json` が配るのは `skills/` だけで MCP サーバー本体を含まない。番号を揃えるとサーバーだけ変わったリリースでもプラグインの番号が上がる。
- **Alternatives Considered**:
  1. 案a — 全部 `package.json` に揃える（1 リポジトリ = 1 バージョン）
  2. 案b — `plugin.json` だけ skills の変更に応じて独立に上げる
- **Selected Approach**: 案a（利用者の合意済み）。
- **Rationale**: どの導入経路でも同じ番号が見えることを優先する。Claude Code のプラグイン更新はリポジトリの取得で行われ、`plugin.json` の `version` は一覧表示に使われる値なので、番号が実態より進んでも壊れる要素がない。判断と手作業を増やさない利点が大きい。
- **Trade-offs**: 番号の上がり方が中身の変化と 1 対 1 でなくなる。
- **Follow-up**: skills を独立配布物として扱う要求が出てきたら再検証する。

### Decision: 不一致の検査を 2 箇所に置く

- **Context**: 同期を版上げ手順に組み込んでも、manifest を手で編集された場合は食い違ったまま公開されうる（要件 5.3）。
- **Alternatives Considered**:
  1. PR チェックだけで検査する
  2. 公開前だけ検査する
  3. 両方で検査する
- **Selected Approach**: 案 3。同期スクリプトに検査モードを持たせ、PR チェックと公開スクリプトの先頭で走らせる。
- **Rationale**: PR チェックは食い違いを早く気づかせるが、Release PR の内容が別経路で変わる可能性を塞げない。公開前の検査は最後の砦として機能し、失敗しても公開されないだけで害がない。
- **Trade-offs**: 同じ検査が 2 回走る（実行時間は無視できる）。
- **Follow-up**: 実装時に、検査が失敗したとき「どのファイルがどの値か」を出力に含める。

### Decision: 導入時に manifest を現行バージョンへ揃える

- **Context**: 現状 `gemini-extension.json` は 1.2.0、`.claude-plugin/plugin.json` は 1.0.0 で、`package.json`（1.7.0）と食い違っている。検査を入れると、最初のリリースまで PR チェックが常に失敗する。
- **Selected Approach**: 実装時に両 manifest を 1.7.0 に揃えたうえで検査を導入する。
- **Rationale**: 検査が導入直後から意味を持つ状態にする。切替後の最初の公開は 1.7.1 になるため（実際に追加された changeset は patch 区分。隔離環境での実測で確認済み）、この初期化は 1 回だけの作業で済む。
- **Trade-offs**: 「1.7.0 として配布された Gemini 拡張は存在しない」という履歴上の不整合が残るが、拡張の更新検知は Release tag で行われるため実害はない。

## Risks & Mitigations

- npm 側の Trusted Publisher が未登録だと公開が失敗する — 前提作業として文書化し、登録対象のワークフローファイル名を `release.yml` に固定する。要件 3.5 のとおり失敗として扱い、成功扱いで tag や Release を作らせない。
- リポジトリ設定の `Allow GitHub Actions to create and approve pull requests` が無効だと Release PR を作れない（action の README が明記）— 前提作業として文書化する。
- 版上げ経路を通らない manifest の手編集 — 検査モードを PR チェックと公開前の 2 箇所に置く。
- 同時に複数の Release 実行が走る — ワークフローに `concurrency` を設定して直列化する。
- `changeset publish` は Node に同梱の npm を使うため、OIDC 対応の npm が要る — 上流の実績と同じ Node 24 を CI で使う。利用者側の `engines`（Node 18+）とは別物である点を混同しない。
- Gemini 拡張のバージョン固定により、npm 未公開の版を指す manifest が配布されると起動できない — action は publish 成功後に tag と Release を作るため順序は満たされる。この順序を崩す変更（publish を後段に移す等）は再検証の契機とする。

## References

- [changesets/action README（v1）](https://github.com/changesets/action/tree/maintenance/v1) — v1 の入力名と前提設定
- [changesets/action README（v2 開発ブランチ）](https://github.com/changesets/action) — v2 の入力名、trusted publishing 時のサブアクション推奨
- [npm Trusted Publishers](https://docs.npmjs.com/trusted-publishers) — 長期トークンなしの公開
- [Gemini CLI: Release extensions](https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/releasing.md) — 取得経路、アーカイブ構造、更新検知
- growi-sdk-typescript の `.github/workflows/release-sdk.yml` — 踏襲する構成の実績
