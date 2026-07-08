---
name: growi-mcp-setup
description: |
  Set up and connect the GROWI MCP server so GROWI tools become available to the agent. Use this skill when the user asks to "set up GROWI", "connect GROWI", "configure the GROWI MCP server", or when GROWI tools (such as suggestPath, searchPages, createPage) are expected but not available. Also use this right after the user has installed the GROWI plugin/skill and needs to finish wiring up the connection.
---

# GROWI MCP Setup: Connection Bootstrap Workflow

Guide the user from "the skill is installed" to "GROWI tools actually work" — setting up **UTCP Code-Mode from scratch**, wiring in the GROWI MCP server, and verifying the connection. This is the shortest supported path: the user should not need to configure UTCP by hand beforehand; this skill walks them through it.

## Scope

This skill takes over **once it is loaded** (i.e. the GROWI plugin/skill is already installed) and drives everything up to "GROWI tools work" — including UTCP Code-Mode setup, which earlier docs assumed was done in advance.

What this skill does **not** cover: installing the plugin/skill itself (adding the marketplace, installing, restarting the agent). That step cannot be automated — the agent cannot act until the skill is recognized — so it lives in the GROWI documentation, not here. See the install instructions in the GROWI docs **"AI ツール（スキル）を使う" / "AI Tools (Skills)"** page (`/guide/features/ai-tools`). Assume the user has finished that when this skill runs.

## Why UTCP Code-Mode

The GROWI MCP server exposes nearly 30 tools (27 as of this writing). Loading every tool schema into the client context is heavy on tokens. UTCP Code-Mode sits between the client and the GROWI MCP server and lets the agent call tools through a single code-execution interface, which keeps context small.

UTCP Code-Mode is the **default path** this skill sets up — do not assume it is already present; the workflow below installs and wires it. A direct MCP connection also works (all tools function) and is offered only as a fallback or for light use — see the last section.

## How UTCP resolves `${VAR}` — read before Steps 3–4

UTCP itself substitutes `${VAR}` references found in `.utcp_config.json` when the code-mode server starts. The shell does not do it, and the MCP client does not do it. Three rules drive everything in Steps 3–4:

1. **Lookups are namespaced by manual name.** Inside a manual named `growi`, `${GROWI_BASE_URL_1}` is looked up as `growi_GROWI_BASE_URL_1`. If the manual has **no `name`**, UTCP assigns a random UUID as its name, the lookup becomes `<uuid>_GROWI_BASE_URL_1`, and it can never match anything — registration always fails.
2. **Lookup order**: the config's `variables` map → `load_variables_from` loaders → the environment of the code-mode process (which is the `env` block of the client-config entry from Step 3). Entries in the `variables` map are themselves substituted **without** a namespace, which is what makes the bridge pattern in Step 4 work.
3. **Failures are silent.** If a variable cannot be resolved (or a server entry is invalid), that manual's registration fails but the code-mode server still starts normally — the client shows the code-mode tools, just zero GROWI tools. Always verify per Step 5.

(Behavior verified against `@utcp/code-mode-mcp` 1.2.1 / `@utcp/sdk` 1.1.x.)

## Workflow

### Step 1: Collect GROWI connection info

Ask the user for:

- **Base URL** of their GROWI instance (e.g. `https://wiki.example.com`)
- **API token** — issued from GROWI: User Settings → API Token
- **App name** — a short identifier the user picks (e.g. `main`)
- **HTTP Basic auth credentials (only if applicable)** — if something in front of GROWI enforces HTTP authentication (e.g. a reverse proxy with Basic auth), also collect that username and password. This is separate from the API token: the proxy credentials go in the `Authorization` header, while the API token is still sent to GROWI via `X-GROWI-ACCESS-TOKEN`. Only Basic auth is supported for now.

The Base URL must be reachable **from the machine where the client launches code-mode**. If GROWI runs in a container (devcontainer, docker compose), `localhost` from inside another container does not reach it — use the compose service hostname (e.g. `http://app:3000`) or `http://host.docker.internal:<port>` as appropriate for the topology.

### Step 2: Prepare UTCP Code-Mode

Assume UTCP Code-Mode is **not yet set up** — this skill installs it now. There is no global install step: UTCP Code-Mode runs on demand via `npx @utcp/code-mode-mcp`, fetched the first time the client launches it. What you set up is the wiring — registering it as an MCP server (Step 3) and giving it a config file (Step 4).

Confirm the prerequisite the on-demand `npx` launch depends on:

- **Node.js LTS (20 or 22 recommended)** and network access (so `npx` can fetch `@utcp/code-mode-mcp` and `@growi/mcp-server` on first run). Check with `node --version`.
  - **`18+` is necessary but not sufficient.** Code-mode depends on `isolated-vm`, a native addon that only ships prebuilt binaries for LTS lines. On an odd-numbered (current) release — e.g. Node 23 — no prebuild exists and code-mode crashes at startup with `No native build was found for ... node=23.x.x ... isolated-vm`. Prefer an LTS line; if the user is on a current release, point them to install an LTS (`nvm install --lts`, `brew install node@22`, etc.).
  - When launched via `npx`, the Node used is whichever `node` is first on the client's `PATH`. If multiple Node versions are installed, the client may pick a non-LTS one even when an LTS is available — pin the LTS on the code-mode entry's `PATH` if in doubt (Step 3 `env`).

If a `code-mode` MCP server is *already* registered in the client config, you do not need to add it again — reuse it: ensure its `UTCP_CONFIG_FILE` includes GROWI (Step 4) and that the GROWI variables are present in its `env` block (Step 3).

In offline or restricted environments where `npx` cannot fetch the packages (some devcontainers, air-gapped setups), you will instead build the packages locally and point the config at the built files — see the last Troubleshooting item before starting.

### Step 3: Register UTCP Code-Mode in the client config

Register a `code-mode` MCP server in the client's MCP config. **This `env` block is also where the actual GROWI values live** — the code-mode process hands its environment to UTCP variable resolution (rule 2 above), and `.utcp_config.json` will only contain `${VAR}` references to them.

The `mcpServers` entry to add (when editing the config manually):

```json
{
  "mcpServers": {
    "code-mode": {
      "command": "npx",
      "args": ["@utcp/code-mode-mcp"],
      "env": {
        "UTCP_CONFIG_FILE": "/absolute/path/to/.utcp_config.json",
        "GROWI_BASE_URL_1": "https://wiki.example.com",
        "GROWI_API_TOKEN_1": "<API token from Step 1>"
      }
    }
  }
}
```

If the GROWI sits behind Basic auth (Step 1), the credential pair also lives in this `env` block, next to the other values: `"GROWI_HTTP_AUTH_USERNAME_1": "<proxy username>"`, `"GROWI_HTTP_AUTH_PASSWORD_1": "<proxy password>"`.

Why real values here and not in `.utcp_config.json`: client configs live under the user's home directory and are not version-controlled, while `.utcp_config.json` often sits inside a project where it is easy to commit by accident. If the user does not want the token in the client config either, use the dotenv alternative in Step 4.

How to add the entry depends on the client:

**Claude Code** — use the `claude mcp add` CLI (or edit the config file). There are three scopes:

- `user` (global, all projects) — stored in `~/.claude.json` under the top-level `mcpServers`. **Default choice**: GROWI is usually wanted everywhere.
- `local` (per-project, private) — stored in `~/.claude.json` under `projects[<cwd>].mcpServers`. Choose this to limit GROWI to one project.
- `project` (shared via VCS) — stored in `.mcp.json` at the project root. **Do not use it for this setup**: the `env` block contains the API token and `.mcp.json` is committed.

```bash
claude mcp add --scope user code-mode \
  --env UTCP_CONFIG_FILE=/absolute/path/to/.utcp_config.json \
  --env GROWI_BASE_URL_1=https://wiki.example.com \
  --env GROWI_API_TOKEN_1=<token> \
  -- npx @utcp/code-mode-mcp
```

(Flags can drift between versions — if the command errors, check `claude mcp add --help`.)

**Claude Desktop** — open Settings → Developer → "Edit Config", or edit the file directly, then restart Claude Desktop:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**Other agents** — edit their respective MCP config file.

### Step 4: Create .utcp_config.json

Create `.utcp_config.json` at the path referenced by `UTCP_CONFIG_FILE`, registering the GROWI MCP server as a tool source:

```json
{
  "variables": {
    "growi_GROWI_BASE_URL_1": "${GROWI_BASE_URL_1}",
    "growi_GROWI_API_TOKEN_1": "${GROWI_API_TOKEN_1}"
  },
  "manual_call_templates": [
    {
      "name": "growi",
      "call_template_type": "mcp",
      "config": {
        "mcpServers": {
          "growi": {
            "transport": "stdio",
            "command": "npx",
            "args": ["@growi/mcp-server"],
            "env": {
              "GROWI_APP_NAME_1": "main",
              "GROWI_BASE_URL_1": "${GROWI_BASE_URL_1}",
              "GROWI_API_TOKEN_1": "${GROWI_API_TOKEN_1}"
            }
          }
        }
      }
    }
  ]
}
```

Every field below is load-bearing — omitting any of them produces one of the failure modes in Troubleshooting:

- **`"name": "growi"` is required.** It namespaces variable lookups (rule 1) and prefixes tool names (`growi.growi.searchPages`). Without it, UTCP uses a random UUID and every `${VAR}` lookup fails.
- **`"transport": "stdio"` is required.** UTCP's MCP call template does not default it (this differs from typical `mcpServers` configs); omitting it fails at discovery with `Unsupported MCP transport: 'undefined'`.
- **The `variables` map is the bridge** between namespaced lookups and the plain names in Step 3's `env` block: `growi_GROWI_BASE_URL_1` (what UTCP looks up from inside the manual) is filled from `${GROWI_BASE_URL_1}` (resolved without a namespace against the code-mode process environment). Keep the `growi_` prefix in the keys in sync with the manual's `name`.
- `GROWI_APP_NAME_1` is a plain inline value (not secret). The `_1` suffix groups one app's settings: **all three of `GROWI_APP_NAME_n` / `GROWI_BASE_URL_n` / `GROWI_API_TOKEN_n` must be present** or the GROWI MCP server fails with `Invalid environment variables` ("At least one GROWI app configuration is required"). For multiple GROWI instances, repeat the trio with `_2`, `_3`, … and add the matching `variables` bridge entries.
- `GROWI_BASE_URL_n` must be a full, valid URL (e.g. `https://wiki.example.com`), not just a hostname.

**If the GROWI sits behind Basic auth (Step 1)**, wire the credential pair through the same pattern — bridge entries in `variables`, `${VAR}` references in the server's `env`:

```json
"variables": {
  "growi_GROWI_HTTP_AUTH_USERNAME_1": "${GROWI_HTTP_AUTH_USERNAME_1}",
  "growi_GROWI_HTTP_AUTH_PASSWORD_1": "${GROWI_HTTP_AUTH_PASSWORD_1}"
},
"env": {
  "GROWI_HTTP_AUTH_USERNAME_1": "${GROWI_HTTP_AUTH_USERNAME_1}",
  "GROWI_HTTP_AUTH_PASSWORD_1": "${GROWI_HTTP_AUTH_PASSWORD_1}"
}
```

The pair is per-app (`_1`, `_2`, …) and optional, but **set both or neither**: a half-set pair fails fast at startup with `Incomplete GROWI HTTP auth configuration for app <n>` (a blank value counts as unset). It does not replace the API token — the proxy credentials go in the `Authorization` header while the API token is still sent to GROWI via `X-GROWI-ACCESS-TOKEN`.

**Alternative: keep the token out of the client config too (dotenv).** Put the values in a separate env file and load it with a variable loader, instead of putting them in Step 3's `env` block:

```json
{
  "load_variables_from": [
    {
      "variable_loader_type": "dotenv",
      "env_file_path": "/absolute/path/to/growi.env"
    }
  ],
  "variables": {
    "growi_GROWI_BASE_URL_1": "${GROWI_BASE_URL_1}",
    "growi_GROWI_API_TOKEN_1": "${GROWI_API_TOKEN_1}"
  },
  "manual_call_templates": [ "...same as above..." ]
}
```

```ini
# /absolute/path/to/growi.env  (chmod 600; never commit)
GROWI_BASE_URL_1=https://wiki.example.com
GROWI_API_TOKEN_1=<API token from Step 1>
```

`env_file_path` must be an **absolute path** — a relative path is resolved against the code-mode process's working directory, which depends on how the client launches it.

### Step 5: Restart the agent and verify

1. Tell the user to restart / reload their agent so the new MCP config is picked up.
2. After restart, confirm that GROWI tools are visible (e.g. `suggestPath`, `searchPages`).
3. Run a lightweight read-only call (such as listing recent pages) to confirm the connection works end to end.

Under UTCP Code-Mode the GROWI tools are not called directly; they are invoked from TypeScript passed to code-mode's `call_tool_chain`, named `<manual>.<manual>_<tool>`. A minimal "it works" check:

```ts
// via code-mode's call_tool_chain
const pages = await growi.growi_getRecentPages({});
// or:
const hits = await growi.growi_searchPages({ q: "test" });
```

A `success: true` result with real data confirms the full code-mode → UTCP → GROWI path, not just that the tools registered.

Step 3 is not optional: tool discovery succeeds **even if the Base URL is wrong or unreachable** — the GROWI MCP server does not contact GROWI at startup. Seeing the tools proves the UTCP wiring; only a real call validates the Base URL and token.

If tools are visible and a call succeeds, setup is complete — the user can now use workflows like `growi-smart-save`. For feature-level usage (what the tools can do, Smart Save, etc.), point them back to the GROWI docs "AI ツール（スキル）を使う" / "AI Tools (Skills)" page.

## Fallback: connecting MCP directly (without UTCP)

If UTCP Code-Mode cannot be used, register the GROWI MCP server directly in the client's MCP config:

```json
{
  "mcpServers": {
    "growi": {
      "command": "npx",
      "args": ["@growi/mcp-server"],
      "env": {
        "GROWI_APP_NAME_1": "main",
        "GROWI_BASE_URL_1": "https://wiki.example.com",
        "GROWI_API_TOKEN_1": "<API token>"
      }
    }
  }
}
```

No `transport` / `name` / `variables` here — those are UTCP concepts; this file is read by the client itself. Note that `${VAR}` expansion in client configs is client-dependent (Claude Code expands it only in `.mcp.json`; Claude Desktop does not expand it at all), so real values in the `env` block are the portable form.

The same optional variables work here too: add `GROWI_HTTP_AUTH_USERNAME_1` / `GROWI_HTTP_AUTH_PASSWORD_1` when GROWI sits behind Basic auth (Step 1).

> [!WARNING]
> Because the token is inline, only put this in a config that is not version-controlled (user-level client config). Never put it in a committed file such as `.mcp.json`.

All GROWI tools work this way, but every tool schema stays resident in the client context. This is fine for light use; for regular use, prefer the UTCP path above.

## Troubleshooting

- **`Variable '<long-random-prefix>_GROWI_BASE_URL_1' referenced in call template configuration not found`** — the manual in `.utcp_config.json` has no `"name"`, so UTCP namespaced the lookup with a random UUID. Add `"name": "growi"` (Step 4).
- **`Variable 'growi_GROWI_BASE_URL_1' ... not found`** — the name is right but the value is missing: no `variables` bridge entry, or `GROWI_BASE_URL_1` absent from the code-mode `env` block (Step 3) / dotenv file (Step 4 alternative).
- **`Unsupported MCP transport: 'undefined'`** — `"transport": "stdio"` is missing on the server entry in `.utcp_config.json` (Step 4).
- **code-mode tools appear, but zero GROWI tools** — the GROWI manual failed to register; code-mode starts normally even when registration fails (rule 3). Check the code-mode server logs (the client's MCP log / stderr) for `Error during batch registration` or `Error registering manual` and match the message against the items above.
- **Tools still not visible after restart** — re-check the `UTCP_CONFIG_FILE` path is absolute and the JSON is valid.
- **`Invalid environment variables` / "At least one GROWI app configuration is required"** — a `GROWI_*_n` trio is incomplete. Each app needs all three of `GROWI_APP_NAME_n`, `GROWI_BASE_URL_n`, `GROWI_API_TOKEN_n` set together (see Step 4).
- **`Incomplete GROWI HTTP auth configuration for app <n>` ("Username and password are required together")** — one of `GROWI_HTTP_AUTH_USERNAME_n` / `GROWI_HTTP_AUTH_PASSWORD_n` is set without the other (a blank value counts as unset). Set both or neither (Step 4).
- **Tools listed but every call fails (auth/network)** — discovery does not contact GROWI (Step 5), so this is the first moment a bad Base URL or token shows up. Verify the URL is reachable from the machine running code-mode (container hostname issues — Step 1) and the token has not been revoked in GROWI.
- **Every call fails with `401` although the API token is correct** — if GROWI sits behind HTTP Basic auth, the proxy rejects requests before they reach GROWI. Set the `GROWI_HTTP_AUTH_USERNAME_n` / `GROWI_HTTP_AUTH_PASSWORD_n` pair for that app (Step 4).
- **`No native build was found for ... isolated-vm` (code-mode crashes at startup)** — the active Node is an odd-numbered (current) release with no `isolated-vm` prebuild (Step 2). Switch the code-mode launch to a Node LTS line (20 / 22): install one (`nvm install --lts`, `brew install node@22`, …) and ensure it is the `node` code-mode uses — pin it on the code-mode entry's `PATH` (Step 3 `env`) if multiple Node versions are installed.
- **`npx` cannot find the package / no registry access** — ensure Node.js LTS (20 / 22) and network access. In offline or restricted environments (some devcontainers), install/build the packages locally and replace `"command": "npx", "args": ["@growi/mcp-server"]` with `"command": "node", "args": ["/path/to/growi-mcp-server/dist/index.js"]` (same for code-mode).
