# Getting a Vault clone (detect, clone, refresh)

The grep discovery in `vault-grep-discovery.md` needs the wiki as local Markdown files. GROWI
exposes the Vault as a **PAT-authenticated git endpoint**, so obtaining and refreshing the clone
is plain `git` — no special tooling. This file is the mechanical how-to; the judgement of *where
a document belongs* lives in `vault-grep-discovery.md`.

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
3. **You can run `git` locally.** The client environment must have `git` (2.31+ for the
   `GIT_CONFIG_*` env vars used below) and a writable working directory. If not, fall back.

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

## Clone (first time)

Pick a stable local cache path the skill owns, namespaced per instance so multiple GROWI
instances don't collide — e.g. `<cache-root>/growi-vault/<instance-id>/`. The user does not need
to manage this path. GROWI does not dictate where the clone lives; that is the client's choice.

Pass the PAT through git's `GIT_CONFIG_*` environment variables rather than `git -c …`, so it
never appears in the process's command line (see "Security notes"):

```bash
export GIT_CONFIG_COUNT=1
export GIT_CONFIG_KEY_0=http.extraHeader
export GIT_CONFIG_VALUE_0="Authorization: Bearer <PAT>"

git clone --filter=blob:none <base-url>/vault.git <cache-root>/growi-vault/<instance-id>
```

Keep those three variables exported for every later `git` command in this clone: it is a partial
clone, so git may need to reach the server again to fill in missing objects.

- `--filter=blob:none` makes it a **partial clone**: the server omits blobs, and git then fetches
  only the ones the checkout actually needs. What this saves is the **history** — every past
  revision of every page — which is where a long-lived wiki's bulk lives. It does **not** shrink
  the checkout itself: the blobs for the current tree are all downloaded when the working tree is
  materialized, not lazily on first read. Discovery greps the working tree, so those blobs are
  needed either way.
- A few pages with names longer than the filesystem limit may fail to check out
  (`File name too long`); the clone still succeeds and all normal pages are present. Ignore that
  warning.
- To actually shrink the checkout — e.g. skip everyone's personal `user/` space — combine the
  filter with sparse-checkout. Sparse-checkout alone only controls which files land in the working
  tree; it does not reduce what the server sends, which is why both flags are needed:

  ```bash
  git clone --filter=blob:none --no-checkout <base-url>/vault.git <dir>
  cd <dir>
  git sparse-checkout init --cone
  git sparse-checkout set '/*' '!/user'
  git checkout HEAD
  ```

  For discovery the plain full checkout above is fine; reach for this only on a wiki large enough
  that the checkout is painful, and remember that pages under `user/` then become invisible to
  grep.

## Refresh (keep it current)

The clone is a snapshot as of the last fetch. **Before using it for discovery, refresh it** so
you are not grepping a stale wiki:

```bash
export GIT_CONFIG_COUNT=1
export GIT_CONFIG_KEY_0=http.extraHeader
export GIT_CONFIG_VALUE_0="Authorization: Bearer <PAT>"

cd <cache-root>/growi-vault/<instance-id>
git fetch --quiet
git reset --hard '@{u}' --quiet
```

Reset to `@{u}` (the current branch's upstream), not `origin/HEAD`: `origin/HEAD` is a symbolic ref
written once at clone time and **not** updated by a later `git fetch`, so resetting to it can
silently leave you on a stale tree.

A fetch is cheap and resolves the freshness concern that a one-time clone would have. If the
fetch fails (network, Vault disabled since last time), fall back to the server suggest-path tool
rather than grepping a stale or missing clone.

## Security notes

- The PAT is the user's existing GROWI API token — do not print it, log it, or write it into the
  clone (never `git config http.extraHeader …`, which persists it in `.git/config`).
- **Do not pass the PAT as a command-line argument.** `git -c http.extraHeader="Authorization:
  Bearer <PAT>" …` puts the token in the process's argv, where any other user on the machine can
  read it out of `ps`, and where it lands in shell history. Use the `GIT_CONFIG_COUNT` /
  `GIT_CONFIG_KEY_0` / `GIT_CONFIG_VALUE_0` environment variables shown above: git reads the same
  config from them, and a process's environment is only readable by its owner (and root).
- The clone contains real wiki content the user can read. Keep it in the skill's cache path, not
  somewhere it would be shared or committed.
