# Getting a Vault clone (detect, clone, refresh)

The grep discovery in `vault-grep-discovery.md` needs the wiki as local Markdown files. GROWI
exposes the Vault as a **PAT-authenticated git endpoint**, and the mechanics of obtaining and
refreshing a clone are wrapped in one deterministic script — `scripts/vault-sync.sh` in this
skill. This file explains when the clone is usable and how to run the script; the judgement of
*where a document belongs* lives in `vault-grep-discovery.md`.

## Is a Vault clone usable? (the branch condition)

Vault local-grep discovery is **opt-in** — the main workflow reaches for it only when the user
asked for higher-accuracy placement (see Step 1b there). Once requested, proceed when **all** of
these hold; otherwise fall back to the server suggest-path tool, which is the default path anyway.
Falling back is always safe.

1. **You can reach the GROWI instance and its API token.** These are the same base URL and token
   the GROWI MCP server is configured with (`GROWI_BASE_URL_n` / `GROWI_API_TOKEN_n` — see the
   `growi-mcp-setup` skill). If multiple GROWI instances are connected, the target is the one
   this save is for; if it is ambiguous, ask the user which instance.
2. **Vault is enabled and bootstrapped on that instance.** The endpoint answers `404` when the
   Vault feature is disabled and `503` when it is enabled but the initial bootstrap has not
   finished; a bad or missing token gives `401`. Treat any failure to clone/fetch as "not usable"
   and fall back — do not block the save.
3. **You can run `git` and a POSIX `sh` locally.** The client environment must have `git`
   (2.31+, for the `GIT_CONFIG_*` env vars the sync script relies on), a POSIX shell to run the
   script (on Windows, Git Bash provides one), and a writable working directory. If not, fall
   back.

If any check fails, say nothing dramatic — mention briefly that Vault is not usable (the user did
ask for it) and use the server suggest-path tool (Step 1a of the main workflow). The user still
gets candidates.

## The git endpoint

GROWI serves the Vault as a **read-only git smart-http endpoint** at `<base-url>/vault.git`:

- `git clone` / `git fetch` work normally (`info/refs` + `git-upload-pack`).
- Pushing is rejected (`git-receive-pack` → 403) — the clone is read-only, which is exactly what
  discovery needs.
- **Authentication is the user's GROWI API token (PAT).** The gateway resolves the token the same
  way the rest of GROWI's API does — precedence `Authorization: Bearer <PAT>` >
  `X-GROWI-ACCESS-TOKEN` > query > body — and adds one git-native fallback: HTTP Basic, where the
  username is ignored and the password is the PAT (`Authorization: Basic base64(x:<PAT>)`). Use
  the Bearer header; it is the first thing the gateway looks at, and it does not collide with a
  reverse proxy's own Basic credential. On auth failure the endpoint answers
  `401 + WWW-Authenticate: Basic`, which will make a bare `git clone` prompt for a
  username/password — supply the header up front so it never gets there.
- **Namespaces are filtered by the token's permissions automatically** — the server only delivers
  the wiki areas that token may read. You do not compute or filter permissions yourself; clone
  with the user's own token and you get exactly the pages they may see.

## Getting and refreshing the clone — run the script

The clone/refresh mechanics live in one script, `scripts/vault-sync.sh` (in this skill), so they
behave the same every time. **Do not assemble `git clone` / `git fetch` commands by hand.** The
script exists because hand-assembled commands fail in agent environments: exported `GIT_CONFIG_*`
variables do not survive from one shell invocation to the next (so the auth header silently goes
missing), and re-deciding "clone or fetch?" plus URL/token substitution on every run invites
quoting and decoding mistakes. The script makes those decisions internally, in a single process.

One command covers both the first clone and every later refresh:

```bash
sh <skill-dir>/scripts/vault-sync.sh sync <n>
```

`<skill-dir>` is the directory this skill was loaded from — the same directory that holds
`SKILL.md`. Use its absolute path: your working directory is the user's project, not the skill,
so a bare `scripts/vault-sync.sh` will not resolve.

- **`<n>` is the GROWI instance number.** The script reads `GROWI_BASE_URL_<n>` and
  `GROWI_API_TOKEN_<n>` from the environment — the same variables the GROWI MCP server is
  configured with (see the `growi-mcp-setup` skill). The PAT therefore never appears in the
  command you write, in shell history, or in a transcript.
- **You do not choose the destination.** With no directory argument the script clones into a fixed
  cache path derived from the instance's base URL, and `sh <skill-dir>/scripts/vault-sync.sh path
  <n>` prints that path without touching the network — use it to locate the clone for grepping.
  Letting the script decide is what makes the clone *reused*: pick your own directory each session
  and every session re-downloads the whole wiki. Pass an explicit directory only when the user
  asked for a specific location. The script refuses a directory that belongs to a different
  instance.
- **Run `sync` before every discovery session.** The script clones on first use and does
  `fetch` + reset-to-upstream afterwards, so you are never grepping a stale wiki.
- **`--no-user` (optional)** leaves everyone's personal `user/` space out of the working tree.
  Reach for it only on a wiki large enough that a full checkout is painful, and remember pages
  under `user/` then become invisible to grep. It takes effect on the **first clone only** — an
  existing clone keeps its layout, so adding or dropping the flag on a refresh changes nothing.
- **Exit codes**: `0` the clone is usable, `1` usage/environment problem, `2` git failure or a
  clone that could not be materialized. The endpoint answers `401` for a bad token, `404` when the
  Vault feature is disabled, `503` while bootstrap has not finished — the script surfaces git's
  message either way. Any non-zero exit means "Vault not usable": fall back to Step 1a.
- A few pages whose names are too long for the local filesystem may fail to materialize (a
  Japanese title of 85 characters already exceeds ext4's 255-byte limit — growilabs/growi#11596).
  The script reports how many (`N of M pages could not be written …`), lists them, keeps every
  other page, and exits `0` — proceed, and mention to the user that those pages were invisible to
  the search. If the failure is broader than that, the script exits `2` instead of passing off an
  incomplete clone as usable.

### If the environment variables are not already exported

The MCP config normally supplies `GROWI_BASE_URL_<n>` / `GROWI_API_TOKEN_<n>` by expanding
`${GROWI_API_TOKEN_1}` from the environment, in which case your shell already has them and there
is nothing to do. When it does not, set them for that one invocation, reading the value out of the
client's MCP config without echoing it — pick the file the user's client actually uses:

```bash
# Claude Code, project scope (.mcp.json in the project root)
GROWI_BASE_URL_1="$(node -p 'JSON.parse(require("fs").readFileSync(".mcp.json","utf8")).mcpServers["code-mode"].env.GROWI_BASE_URL_1')" \
GROWI_API_TOKEN_1="$(node -p 'JSON.parse(require("fs").readFileSync(".mcp.json","utf8")).mcpServers["code-mode"].env.GROWI_API_TOKEN_1')" \
  sh <skill-dir>/scripts/vault-sync.sh sync 1
```

For Claude Code's `local`/`user` scopes the same values live in `~/.claude.json` (under
`projects[<cwd>].mcpServers` and top-level `mcpServers` respectively); for Claude Desktop they are
in `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/`, Windows:
`%APPDATA%\Claude\`). If the config stores `"${GROWI_API_TOKEN_1}"` rather than a literal value and
the variable is not set, the token is not available to you — say so and use Step 1a rather than
asking the user to paste a token into the chat.

On the wire this is an ordinary **full clone**, history included. The Vault endpoint does not
advertise git's `filter` capability, so `--filter=blob:none` would be silently ignored (git only
prints `warning: filtering not recognized by server, ignoring`) while still transferring
everything — and it would mark the clone a *promisor* repo, which is worse than useless here
because the Vault deliberately refuses fetches of objects it did not advertise
(`uploadpack.allowAnySHA1InWant=false`), so any later lazy fetch fails. The script therefore does
not pass `--filter`. Budget for the first clone accordingly: on a long-lived wiki it is the
slowest part of Vault mode, and `--no-user` shrinks the working tree but **not** the transfer.
(Tracked upstream as growilabs/growi#11595 — revisit if the Vault gains a supported way to skip
history.)

**Route any git operation on this clone through the script.** Authentication exists only inside
the script's process — a bare `git fetch`, or any other git command that goes back to the server,
would run unauthenticated and fail. Discovery itself needs no git at all: `ls`/`grep`/file reads
work on plain files.

### Decoding on-disk names

On-disk names percent-encode path-unsafe characters. When turning a discovered file path back
into a GROWI page path (see `vault-grep-discovery.md`), decode segments with the same script
rather than by hand:

```bash
sh <skill-dir>/scripts/vault-sync.sh decode '旧%3A old page.md'   # → 旧: old page.md
```

## Security notes

- The PAT is the user's existing GROWI API token. The sync script reads it from the environment
  (`GROWI_API_TOKEN_<n>`) inside its own process, passes it to git via the `GIT_CONFIG_COUNT` /
  `GIT_CONFIG_KEY_*` / `GIT_CONFIG_VALUE_*` environment variables, and never persists it — so the
  token appears nowhere another user could read it: not in process argv (`ps`), not in shell
  history, not in `.git/config`, not in a transcript.
- The script also resets `credential.helper` to empty for its git calls. Without that, a `401`
  hands the request to whatever credential helper the machine has configured (Git Credential
  Manager, the VS Code helper, …), which on a desktop can open a login dialog and block until
  someone dismisses it. `GIT_TERMINAL_PROMPT=0` alone does not prevent this — it only suppresses
  git's own terminal prompt.
- Keep it that way when driving the script: never echo the token, never paste it into a command
  line as an argument, and never run `git config http.extraHeader …` by hand (that would persist
  it in `.git/config`).
- The clone contains real wiki content the user can read. Keep it in the skill's cache path, not
  somewhere it would be shared or committed.
