# Requirements Document

## Project Description (Input)

### 誰の課題か

growi-mcp-server のリリース担当メンテナと、npm / Gemini CLI / Claude Code / skills.sh の各経路で本サーバーを導入する利用者。

### 現状

**リリース作業がすべて手作業で、リポジトリに CI が 1 つも無い**（`.github/` ディレクトリ自体が存在しない）。

- 版上げは `chore: bump version to X.Y.Z` の手コミット。tag も手作りで、v1.3.1 までは注釈付き tag、v1.4.0 以降は軽量 tag と形式が不統一。npm 公開はローカルからの手動実行（`package.json` に publish 系スクリプトが無い）。
- `CHANGELOG.md` が無く、変更履歴は GitHub Release の自動生成文（PR タイトルの羅列）のみ。
- PR 時に lint / test を回す仕組みが無いため、壊れた変更が main に入っても気づけない。

**バージョン番号が 3 か所に分散し、2 か所が放置されている。**

| 配布物 | バージョンの出所 | 現在値 |
| --- | --- | --- |
| npm `@growi/mcp-server` | `package.json` | 1.7.0（npm の latest も 1.7.0） |
| Gemini CLI 拡張 | `gemini-extension.json` | 1.2.0（追加時から一度も更新されていない） |
| Claude Code プラグイン | `.claude-plugin/plugin.json` | 1.0.0（同上） |
| skills.sh (`npx skills add`) | バージョン概念なし（既定ブランチの `skills/` を読む） | — |

**Gemini CLI 拡張として配布した場合、MCP サーバーが起動しない状態にある**（Gemini CLI 本体の実装 `packages/cli/src/config/extensions/github.ts` および `extension-manager.ts` を読んで確認済み）。

- `gemini extensions install <GitHub URL>` はまず GitHub Release を参照する。カスタム添付ファイルが無い場合は、その tag の自動生成ソース tarball を取得して展開する（`downloadFromGitHubRelease` が `releaseData.tarball_url` にフォールバックする）。
- 本リポジトリの Release には添付ファイルが 1 つも無いため、常にソース tarball が使われる。そこには `dist/` が含まれない（`.gitignore` 対象で、コミットされたこともない）。
- `gemini-extension.json` は起動コマンドを `node ${extensionPath}/dist/index.js` と書いているため、**インストール自体は成功扱いになる一方で MCP サーバーは起動できない**（skills だけが使える状態になる）。
- なお Gemini CLI の更新検知は `github-release` 種別では Release tag の比較で行われ、`gemini-extension.json` の `version` は画面表示にのみ使われる。上流ドキュメントは「混乱を避けるため manifest の version と Release tag を揃えること」を求めている。

### 何を変えるか

1. **changesets ベースのリリースフローを導入する。** 姉妹リポジトリ growi-sdk-typescript で稼働実績のある方式を踏襲し、版上げ・CHANGELOG 生成・npm 公開・tag 作成・GitHub Release 作成を自動化する。
   - `changesets/action` により「main への push で Release PR を作る」→「その PR をマージすると公開」の 2 段構えにする。
   - npm 公開は `NPM_TOKEN` を置かず、OIDC による Trusted Publishing（provenance 付き）で行う。sdk 側は同方式で公開できていることを確認済み（`@growi/sdk-typescript@1.13.0` に provenance あり）。
   - 単一パッケージのリポジトリなので changesets が作る tag は `v1.8.0` 形式になり、既存 tag の形式と連続する。
   - 公開前に ncc ビルドを走らせる必要があり、`files` に `CHANGELOG.md` を追加する必要がある。
2. **全 PR で lint / test を回す CI を新設する。** sdk 側の PR チェックは自動生成 SDK 特有の label 条件付きなので、その条件は踏襲せず無条件で回す。
3. **npm 以外の配布物のバージョンを `package.json` に自動追従させる。** changesets は `package.json` しか書き換えないため、`gemini-extension.json` と `.claude-plugin/plugin.json` を同期する処理を版上げ手順に組み込み、手作業の取りこぼしを無くす。
4. **Gemini CLI 拡張の配布方式を npm 経由に切り替える（決定済み）。** `gemini-extension.json` の起動コマンドを `npx -y @growi/mcp-server@<version>` に変え、`${extensionPath}/dist` への依存をやめる。配布の実体が npm 1 本に集約され、リリースごとに管理する成果物が増えない。バージョンは同期処理が固定する。

### 前提作業（人間が行う）

- npm 側で対象パッケージに Trusted Publisher を登録する（リポジトリ `growilabs/growi-mcp-server` と公開ワークフローのファイル名を指定）。これが済むまで公開ジョブは失敗する。

### スコープ外

- 既存の v1.0.0〜v1.7.0 分を遡って `CHANGELOG.md` に流し込むことは行わない（過去分は GitHub Release を参照する）。
- npm の `next` dist-tag に残っている `1.0.0-RC.6` は触らない（changesets の pre モードを使わない限り影響しない）。
- Gemini CLI 拡張のオフライン起動、および初回起動の高速化は目的としない（npm からの取得を前提とする）。

## Introduction

本 spec は growi-mcp-server のリリース作業を、手作業の連鎖から「変更意図を PR に残す → main にマージ → リリース用 PR を承認する」という再現可能な流れに置き換えるための要件を扱う。

対象は次の 4 つである。

- **PR ごとの品質チェック**（現在は仕組みが存在しない）
- **版上げ・変更履歴・npm 公開・tag・GitHub Release の自動化**（現在はすべて手作業）
- **配布物間のバージョン整合**（現在は 3 か所に分散し 2 か所が放置されている）
- **Gemini CLI 拡張が導入直後に動作すること**（現在は起動できない）

方式の決定は 2 つ済んでいる。1 つは changesets の採用（姉妹リポジトリ growi-sdk-typescript で稼働実績があり、tag 形式も既存と連続する）。もう 1 つは Gemini CLI 拡張の起動を npm 経由（`npx`）に切り替えることである。後者は「リリースごとに管理する成果物を増やさない」ことを優先した判断で、その代償としてオフライン起動と初回起動の速さを要件から外している。

本 spec は公開の入口（npm パッケージ）と、そこから派生する配布物のバージョン表示までを対象とする。ツールの機能追加・変更、および skills.sh 経由の配布（バージョン概念を持たず既定ブランチを読む）は対象に含めない。

## Requirements

### Requirement 1: PR ごとの品質チェック

**Objective:** メンテナとして、main に入る前に lint とテストの結果を見たい。そうすれば壊れた変更が公開物に混ざらない。

#### Acceptance Criteria

1. When PR が作成または更新されたとき, the PR Check Workflow shall lint とテストを実行し、その結果を当該 PR のチェック結果として表示する.
2. If lint またはテストが失敗したとき, the PR Check Workflow shall 失敗として報告する（成功扱いにしない）.
3. The PR Check Workflow shall label・タイトル・変更ファイルなどの条件によらず、すべての PR に対して実行される.

### Requirement 2: 変更意図の記録とバージョン区分の決定

**Objective:** 貢献者として、変更と同時に「利用者にとって patch / minor / major のどれか」と説明文を残したい。そうすれば公開時に誰かが履歴を思い出して書き起こす必要がなくなる。

#### Acceptance Criteria

1. When 貢献者が利用者に影響する変更を含む PR を出すとき, the Release Process shall 影響区分（patch / minor / major）と利用者向け説明文を PR に記録する手段を提供する.
2. When 変更意図の記録を含まない変更のみが main にマージされたとき, the Release Workflow shall 版上げもリリースも行わない.
3. The Release Process shall 記録された説明文を人間が読める文章として保持し、公開時の変更履歴にそのまま反映する.

補足: 記録の有無を PR チェックで強制することは本 spec の要件に含めない（内部変更のみの PR では記録が不要なため）。

### Requirement 3: リリースの実行

**Objective:** メンテナとして、main にマージした後の公開作業を「リリース用 PR を承認する」1 回の操作で済ませたい。そうすれば手作業のコミット・tag 付け・publish が不要になる。

#### Acceptance Criteria

1. When 変更意図の記録を含む変更が main にマージされたとき, the Release Workflow shall 次バージョンへの版上げと変更履歴の追記を反映したリリース用 PR を作成または更新する.
2. When リリース用 PR が main にマージされたとき, the Release Workflow shall 配布物をビルドしたうえで npm に公開する.
3. When 公開が成功したとき, the Release Workflow shall `v` とバージョン番号からなる tag（例: `v1.8.0`）と、その tag に対応する GitHub Release を作成する.
4. The Release Workflow shall 長期有効な公開用トークンをリポジトリに保管せずに公開を行い、公開物には出所を検証できる証明（provenance）を付ける.
5. If 公開に必要な npm 側の許可設定が未登録であるとき, the Release Workflow shall 公開を失敗として報告する（成功扱いで後続の tag・GitHub Release 作成に進まない）.
6. The Release Workflow shall 公開物に変更履歴ファイルを含める.

### Requirement 4: 変更履歴の可読性

**Objective:** 利用者として、どのバージョンで何が変わったかをリポジトリ内の 1 ファイルで追いたい。そうすれば Release ページを 1 件ずつ開かなくても差分の経緯が分かる。

#### Acceptance Criteria

1. When 新しいバージョンが公開されたとき, the Release Workflow shall そのバージョンの見出しと変更内容を変更履歴ファイルの先頭に追記する.
2. The 変更履歴 shall 各項目について、対応する PR とコミットへの参照を含む.
3. The 変更履歴 shall 本 spec 導入後に公開されるバージョン以降を対象とし、v1.0.0〜v1.7.0 を遡って収録しない.

### Requirement 5: 配布物間のバージョン整合

**Objective:** 利用者として、どの導入経路でも同じバージョン番号が表示される状態にしたい。そうすれば「拡張は 1.2.0 なのに npm は 1.7.0」のような食い違いで、自分が古い版を使っているのか判断できなくなることがない。

#### Acceptance Criteria

1. When 版上げが行われたとき, the Version Sync Step shall Gemini CLI 拡張の manifest と Claude Code プラグインの manifest のバージョンを、パッケージのバージョンと同じ値に更新する.
2. When 版上げが行われたとき, the Version Sync Step shall Gemini CLI 拡張が起動する MCP サーバーのバージョン指定を、同じ値に更新する.
3. If いずれかの manifest のバージョンがパッケージのバージョンと一致しない状態で公開が試みられたとき, the Release Workflow shall 不一致を検出して失敗として報告する.
4. The Version Sync Step shall バージョン以外の記述（説明文・設定項目・起動引数の構成など）を変更しない.

### Requirement 6: Gemini CLI 拡張が導入直後に動作する

**Objective:** Gemini CLI の利用者として、README の案内どおりにインストールしたら GROWI ツールが使える状態になってほしい。そうすれば「インストールは成功したのにツールが出てこない」という原因の分かりにくい状態に陥らない。

#### Acceptance Criteria

1. When 利用者が README の案内どおりに Gemini CLI 拡張をインストールしたとき, the Gemini CLI Extension shall MCP サーバーを起動し、GROWI ツールを利用可能にする.
2. The Gemini CLI Extension shall リポジトリのソース一式に含まれないビルド成果物（`dist/`）が導入先に存在することを前提としない.
3. While 拡張の表示バージョンが特定の値であるとき, the Gemini CLI Extension shall 同じバージョンの MCP サーバーを起動する.
4. The Gemini CLI Extension shall インストール後の GROWI 接続設定として、環境変数による既存の設定方法を維持する.

補足: オフライン環境での起動と初回起動時間の短縮は要件としない（npm からの取得を前提とする）。

### Requirement 7: リリース手順の文書化

**Objective:** メンテナ（将来の担当者を含む）として、リリースの流れと前提設定を読んで再現したい。そうすれば手順が特定の個人の記憶に依存しない。

#### Acceptance Criteria

1. The Repository Documentation shall 変更意図の記録方法、リリースの 2 段の流れ、および npm 側に必要な前提設定を記載する.
2. The Repository Documentation shall 英語版と日本語版の README の双方に同じ導線を置く.

### Requirement 8: 既存の公開状態との連続性

**Objective:** 既存の利用者として、リリースフローの切替後も導入方法とバージョン番号の連なりが途切れないでほしい。そうすれば更新の可否を今までと同じ見方で判断できる。

#### Acceptance Criteria

1. The Release Workflow shall 既存の tag 形式（`vX.Y.Z`）を維持し、切替後の最初の公開を 1.7.0 の後続バージョンとする.
2. The Release Workflow shall npm の `next` dist-tag に残る既存の値（`1.0.0-RC.6`）を変更しない.
3. The Release Workflow shall 既定で `latest` 以外の dist-tag へ公開しない.
4. The Release Process shall 既存の導入方法（`npx @growi/mcp-server` による直接利用、Claude Code プラグイン、skills.sh）の利用手順を変更しない.
