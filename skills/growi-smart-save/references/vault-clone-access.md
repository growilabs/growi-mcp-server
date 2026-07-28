# Getting a Vault clone (detect, clone, refresh)

The grep discovery in `vault-grep-discovery.md` needs the wiki as local Markdown files. GROWI
exposes the Vault as a **PAT-authenticated git endpoint**, and obtaining and refreshing a clone is
wrapped in one command shipped with the GROWI MCP server itself — `vault-sync`. This file explains
when the clone is usable and how to run that command; the judgement of *where a document belongs*
lives in `vault-grep-discovery.md`.

## Is a Vault clone usable? (the branch condition)

Vault local-grep discovery is **opt-in** — the main workflow reaches for it only when the user asked
for higher-accuracy placement (see Step 1b there). Once requested, proceed when **all** of these
hold; otherwise fall back to the server suggest-path tool, which is the default path anyway.
Falling back is always safe.

1. **The GROWI MCP server is connected and configured for the instance you mean.** `vault-sync`
   reads the instance's base URL and credential from the very same configuration the MCP server runs
   on, so if GROWI tools work, the command has what it needs. Identify the instance by its **app
   name** (`--app-name`), the same identifier every GROWI tool takes. If several instances are
   connected and it is ambiguous which one this save is for, ask the user.
2. **Vault is enabled and bootstrapped on that instance.** The endpoint answers `404` when the Vault
   feature is disabled and `503` when it is enabled but the initial bootstrap has not finished; a bad
   or missing token gives `401`. Treat any failure as "not usable" and fall back — do not block the
   save.
3. **You can run commands locally, with Node.js and `git` available.** Node.js is what the MCP server
   itself runs on, so it is present wherever GROWI tools work; `git` must be **2.31 or newer** (for
   the `GIT_CONFIG_*` environment variables the command relies on), and the cache directory must be
   writable. Check cheaply with `node --version` and `git --version` **before** telling the user to
   expect a wait.

If any check fails, say nothing dramatic — mention briefly that Vault is not usable (the user did ask
for it) and use the server suggest-path tool (Step 1a of the main workflow). The user still gets
candidates.

## The git endpoint

GROWI serves the Vault as a **read-only git smart-http endpoint** at `<base-url>/vault.git`:

- `git clone` / `git fetch` work normally (`info/refs` + `git-upload-pack`).
- Pushing is rejected (`git-receive-pack` → 403) — the clone is read-only, which is exactly what
  discovery needs.
- **Authentication is the user's GROWI API token (PAT).** The gateway resolves the token the same way
  the rest of GROWI's API does — precedence `Authorization: Bearer <PAT>` > `X-GROWI-ACCESS-TOKEN` >
  query > body — and adds one git-native fallback: HTTP Basic, where the username is ignored and the
  password is the PAT.
- **When the instance sits behind its own HTTP auth** (a reverse proxy asking for Basic
  credentials), those credentials take the `Authorization` header and the PAT moves to
  `X-GROWI-ACCESS-TOKEN` — the same arrangement the MCP server uses for ordinary API calls.
  `vault-sync` does this automatically when `GROWI_HTTP_AUTH_USERNAME_<n>` / `_PASSWORD_<n>` are
  configured for that app. This is a reason to use the command rather than a hand-written
  `git clone`: without those headers a proxied instance answers `401`, and Vault mode would never
  work there at all.
- On auth failure the endpoint answers `401 + WWW-Authenticate: Basic`, which would make a bare
  `git clone` prompt for a username and password. `vault-sync` supplies the header up front and
  disables prompting, so it fails immediately instead of hanging.
- **Namespaces are filtered by the token's permissions automatically** — the server only delivers the
  wiki areas that token may read. You do not compute or filter permissions yourself.

## Getting and refreshing the clone

One command covers both the first clone and every later refresh:

```bash
npx @growi/mcp-server vault-sync --app-name <name>
```

If the MCP server is registered some other way than `npx` — a Gemini CLI extension, or a local build
— run that same entry point with the subcommand appended, for example
`node /path/to/dist/index.js vault-sync --app-name <name>`. The subcommand lives in the package that
serves the MCP tools, so the two always agree about which instance is which.

- **`--app-name` names the instance**, exactly as in every GROWI tool call. Omit it and the
  configured default app is used. The command prints the app name and base URL it resolved — read
  that back before grepping, so a multi-instance setup cannot quietly send you into the wrong wiki.
- **You do not choose the destination.** With no `--dest` the clone goes to a fixed cache path derived
  from the instance's base URL, and

  ```bash
  npx @growi/mcp-server vault-path --app-name <name>
  ```

  prints that path without touching the network — use it to locate the clone for grepping. Letting
  the command decide is what makes the clone *reused*: pick your own directory each session and every
  session re-downloads the whole wiki. Pass `--dest <dir>` only when the user asked for a specific
  location. A directory that belongs to a different instance is refused.
- **Run it before every discovery session.** It clones on first use and does `fetch` +
  reset-to-upstream afterwards, so you are never grepping a stale wiki.
- **`--no-user` (optional)** leaves everyone's personal `user/` space out of the working tree. Reach
  for it only on a wiki large enough that a full checkout is painful, and remember pages under
  `user/` then become invisible to grep. It needs git 2.35+ and takes effect on the **first clone
  only** — an existing clone keeps its layout, so adding or dropping the flag on a refresh changes
  nothing.
- **Exit codes**: `0` the clone is usable, `1` a usage or environment problem (unknown app name, no
  configuration, git missing or too old), `2` a git failure or a clone that could not be
  materialized. Any non-zero exit means "Vault not usable": fall back to Step 1a.
- A few pages whose names are too long for the local filesystem may fail to materialize (a Japanese
  title of 85 characters already exceeds ext4's 255-byte limit — growilabs/growi#11596). The command
  reports how many and lists them, keeps every other page, and exits `0` — proceed, and mention to
  the user that those pages were invisible to the search. If the failure is broader than that it
  exits `2` instead of passing off an incomplete clone as usable.

On the wire this is an ordinary **full clone**, history included. The Vault endpoint does not
advertise git's `filter` capability, so `--filter=blob:none` would be silently ignored (git only
prints `warning: filtering not recognized by server, ignoring`) while still transferring everything —
and it would mark the clone a *promisor* repo, which is worse than useless here because the Vault
deliberately refuses fetches of objects it did not advertise (`uploadpack.allowAnySHA1InWant=false`),
so any later lazy fetch fails. Budget for the first clone accordingly: on a long-lived wiki it is the
slowest part of Vault mode, and `--no-user` shrinks the working tree but **not** the transfer.
(Tracked upstream as growilabs/growi#11595 — revisit if the Vault gains a supported way to skip
history.)

**Route any git operation on this clone through `vault-sync`.** Authentication exists only inside
that command's process — a bare `git fetch`, or any other git command that goes back to the server,
would run unauthenticated and fail. Discovery itself needs no git at all: `ls`/`grep`/file reads work
on plain files.

### Decoding on-disk names

On-disk names percent-encode path-unsafe characters. When turning a discovered file path back into a
GROWI page path (see `vault-grep-discovery.md`), decode segments with the helper rather than by hand:

```bash
npx @growi/mcp-server vault-decode '旧%3A old page.md'   # → 旧: old page.md
```

It needs no GROWI configuration, so it works even when the connection does not.

## Security notes

- You never handle the token. `vault-sync` resolves it from the MCP server's own configuration inside
  its own process and passes it to git through the `GIT_CONFIG_COUNT` / `GIT_CONFIG_KEY_*` /
  `GIT_CONFIG_VALUE_*` environment variables, so it appears in no command line (`ps`), no shell
  history and no transcript, and is never written to `.git/config`.
- Never ask the user to paste a token into the chat, and never run `git config http.extraHeader …` by
  hand (that would persist it in `.git/config`). If the command reports that no configuration is
  available, fall back to Step 1a instead.
- The command also clears `credential.helper` for its git calls. Without that, a `401` hands the
  request to whatever credential helper the machine has configured (Git Credential Manager, the
  VS Code helper, …), which on a desktop can open a login dialog and block until someone dismisses
  it. Disabling git's own terminal prompt alone does not prevent this.
- The clone contains real wiki content the user can read. Keep it in the default cache path, not
  somewhere it would be shared or committed.
