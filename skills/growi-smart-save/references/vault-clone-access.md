# Getting a Vault clone (detect, clone, refresh)

The grep discovery in `vault-grep-discovery.md` needs the wiki as local Markdown files. GROWI
exposes the Vault as a **PAT-authenticated git endpoint**, so obtaining and refreshing the clone
is plain `git` — no special tooling. This file is the mechanical how-to; the judgement of *where
a document belongs* lives in `vault-grep-discovery.md`.

## Is a Vault clone usable? (the branch condition)

Use Vault local-grep discovery when **all** of these hold; otherwise fall back to the server
suggest-path tool. Falling back is always safe — it is the original behavior.

1. **You can reach the GROWI instance and its API token.** These are the same base URL and token
   the GROWI MCP server is configured with (`GROWI_BASE_URL_n` / `GROWI_API_TOKEN_n` — see the
   `growi-mcp-setup` skill). If multiple GROWI instances are connected, the target is the one
   this save is for; if it is ambiguous, ask the user which instance.
2. **Vault is enabled and bootstrapped on that instance.** The git endpoint returns an error
   page or refuses if Vault is off or its initial bootstrap has not finished. Treat any failure
   to clone/fetch as "not usable" and fall back — do not block the save.
3. **You can run `git` locally.** The client environment must have `git` and a writable working
   directory. If not, fall back.

If any check fails, say nothing dramatic — just use the server suggest-path tool (Step 1b of the
main workflow). The user still gets candidates.

## The git endpoint

GROWI serves the Vault as a **read-only git smart-http endpoint** at `<base-url>/vault.git`:

- `git clone` / `git fetch` work normally (`info/refs` + `git-upload-pack`).
- Pushing is rejected (`git-receive-pack` → 403) — the clone is read-only, which is exactly what
  discovery needs.
- **Authentication is the user's GROWI API token (PAT)**, sent as a Bearer header.
- **Namespaces are filtered by the token's permissions automatically** — the server only delivers
  the wiki areas that token may read. You do not compute or filter permissions yourself; clone
  with the user's own token and you get exactly the pages they may see.

## Clone (first time)

Pick a stable local cache path the skill owns, namespaced per instance so multiple GROWI
instances don't collide — e.g. `<cache-root>/growi-vault/<instance-id>/`. The user does not need
to manage this path. GROWI does not dictate where the clone lives; that is the client's choice.

```bash
git -c http.extraHeader="Authorization: Bearer <PAT>" \
  clone --filter=blob:none <base-url>/vault.git <cache-root>/growi-vault/<instance-id>
```

- `--filter=blob:none` makes it a **partial clone** — file contents are fetched lazily, so the
  initial clone stays small even on a large wiki. `grep`/`read` still work; blobs download on
  first access. (Recommended by the GROWI Vault docs.)
- A few pages with names longer than the filesystem limit may fail to check out
  (`File name too long`); the clone still succeeds and all normal pages are present. Ignore that
  warning.
- If you only need shared pages and want to skip personal `user/` space, you can additionally use
  sparse-checkout — but the default full checkout is fine for discovery.

## Refresh (keep it current)

The clone is a snapshot as of the last fetch. **Before using it for discovery, refresh it** so
you are not grepping a stale wiki:

```bash
cd <cache-root>/growi-vault/<instance-id>
git -c http.extraHeader="Authorization: Bearer <PAT>" fetch --quiet
git reset --hard origin/HEAD --quiet
```

A fetch is cheap and resolves the freshness concern that a one-time clone would have. If the
fetch fails (network, Vault disabled since last time), fall back to the server suggest-path tool
rather than grepping a stale or missing clone.

## Security notes

- The PAT is the user's existing GROWI API token — do not print it, log it, or write it into the
  clone. Pass it only via the `http.extraHeader` argument at call time.
- The clone contains real wiki content the user can read. Keep it in the skill's cache path, not
  somewhere it would be shared or committed.
