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
sh scripts/vault-sync.sh sync <n> <cache-root>/growi-vault/<instance-id>
```

- **`<n>` is the GROWI instance number.** The script reads `GROWI_BASE_URL_<n>` and
  `GROWI_API_TOKEN_<n>` from the environment — the same variables the GROWI MCP server is
  configured with (see the `growi-mcp-setup` skill). The PAT therefore never appears in the
  command you write, in shell history, or in a transcript. If those variables are not already
  exported in the shell, set them for that one invocation by reading the value from wherever the
  MCP configuration keeps it, without echoing it — e.g.
  `GROWI_API_TOKEN_1="$(…read from the MCP config…)" GROWI_BASE_URL_1="<base-url>" sh scripts/vault-sync.sh sync 1 <dir>`.
- **Run it before every discovery session.** The script clones on first use and does
  `fetch` + hard-reset-to-upstream afterwards, so you are never grepping a stale wiki. The
  destination is a stable path the skill owns, namespaced per instance (e.g.
  `<cache-root>/growi-vault/<instance-id>/`); the script refuses a directory that belongs to a
  different instance.
- **`--no-user` (optional)** leaves everyone's personal `user/` space out of the working tree.
  Reach for it only on a wiki large enough that a full checkout is painful, and remember pages
  under `user/` then become invisible to grep.
- **Exit codes**: `0` success, `1` usage/environment problem, `2` git failure. The endpoint
  answers `401` for a bad token, `404` when the Vault feature is disabled, `503` while bootstrap
  has not finished — the script surfaces git's message either way. Any non-zero exit means
  "Vault not usable": fall back to Step 1a.
- A page whose name is too long for the local filesystem may fail to materialize; the script
  prints a warning, keeps every other page, and still exits `0`.

On the wire the script clones with `--filter=blob:none` (partial clone). What that omits is the
**history** — every past revision of every page, which is where a long-lived wiki's bulk lives.
It does not shrink the checkout itself: the current tree's blobs are downloaded when the working
tree is materialized (with `--no-user`, the excluded blobs are genuinely never fetched).

**Route any git operation on this clone through the script.** Authentication exists only inside
the script's process — a bare `git fetch`, or any git command that goes back to the server (e.g.
a history operation triggering a partial-clone blob fetch), would run unauthenticated and fail.
Discovery itself needs no git at all: `ls`/`grep`/file reads work on plain files.

### Decoding on-disk names

On-disk names percent-encode path-unsafe characters. When turning a discovered file path back
into a GROWI page path (see `vault-grep-discovery.md`), decode segments with the same script
rather than by hand:

```bash
sh scripts/vault-sync.sh decode '旧%3A old page.md'   # → 旧: old page.md
```

## Security notes

- The PAT is the user's existing GROWI API token. The sync script reads it from the environment
  (`GROWI_API_TOKEN_<n>`) inside its own process, passes it to git via the `GIT_CONFIG_COUNT` /
  `GIT_CONFIG_KEY_0` / `GIT_CONFIG_VALUE_0` environment variables, and never persists it — so the
  token appears nowhere another user could read it: not in process argv (`ps`), not in shell
  history, not in `.git/config`, not in a transcript.
- Keep it that way when driving the script: never echo the token, never paste it into a command
  line as an argument, and never run `git config http.extraHeader …` by hand (that would persist
  it in `.git/config`).
- The clone contains real wiki content the user can read. Keep it in the skill's cache path, not
  somewhere it would be shared or committed.
