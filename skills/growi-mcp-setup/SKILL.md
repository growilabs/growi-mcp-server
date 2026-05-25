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

## Workflow

### Step 1: Collect GROWI connection info

Ask the user for:

- **Base URL** of their GROWI instance (e.g. `https://wiki.example.com`)
- **API token** — issued from GROWI: User Settings → API Token
- **App name** — a short identifier the user picks (e.g. `main`)

### Step 2: Prepare UTCP Code-Mode

Assume UTCP Code-Mode is **not yet set up** — this skill installs it now. There is no global install step: UTCP Code-Mode runs on demand via `npx @utcp/code-mode-mcp`, fetched the first time the client launches it. What you set up is the wiring — registering it as an MCP server (Step 3) and giving it a config file (Step 4).

Confirm the prerequisite the on-demand `npx` launch depends on:

- **Node.js 18+** and network access (so `npx` can fetch `@utcp/code-mode-mcp` and `@growi/mcp-server` on first run). Check with `node --version`.

If a `code-mode` MCP server is *already* registered in the client config, you do not need to add it again — reuse it and only ensure its `UTCP_CONFIG_FILE` includes GROWI (Step 4).

### Step 3: Register UTCP Code-Mode in the client config

Register a `code-mode` MCP server in the client's MCP config. How to do this depends on the client.

**Claude Code** — edit the config file, or use the `claude mcp add` CLI. There are three scopes:

- `local` (per-project, private) — stored in `~/.claude.json` under `projects[<cwd>].mcpServers`
- `user` (global, all projects) — stored in `~/.claude.json` under the top-level `mcpServers`
- `project` (shared via VCS) — stored in `.mcp.json` at the project root (supports `${VAR}` expansion)

`claude mcp add` can register stdio servers; run `claude mcp add --help` to check the exact flags for scope and for passing an env var like `UTCP_CONFIG_FILE`.

**Claude Desktop** — open Settings → Developer → "Edit Config", or edit the file directly, then restart Claude Desktop:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**Other agents** — edit their respective MCP config file.

The `mcpServers` entry to add (when editing the config manually):

```json
{
  "mcpServers": {
    "code-mode": {
      "command": "npx",
      "args": ["@utcp/code-mode-mcp"],
      "env": {
        "UTCP_CONFIG_FILE": "/absolute/path/to/.utcp_config.json"
      }
    }
  }
}
```

### Step 4: Create .utcp_config.json

Create `.utcp_config.json` at the path referenced by `UTCP_CONFIG_FILE`, registering the GROWI MCP server as a tool source:

```json
{
  "manual_call_templates": [
    {
      "call_template_type": "mcp",
      "config": {
        "mcpServers": {
          "growi": {
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

- `${VAR}` references an environment variable — prefer this over writing the token inline.
- The values collected in Step 1 fill `GROWI_APP_NAME_1` / `GROWI_BASE_URL_1` / `GROWI_API_TOKEN_1`.
- The `_1` suffix groups one app's settings. **All three (`GROWI_APP_NAME_n`, `GROWI_BASE_URL_n`, `GROWI_API_TOKEN_n`) must be present for that app to be recognized** — if any one is missing, the GROWI MCP server fails to start with `Invalid environment variables` ("At least one GROWI app configuration is required"). To connect multiple GROWI instances, repeat the trio with `_2`, `_3`, etc.
- `GROWI_BASE_URL_n` must be a full, valid URL (e.g. `https://wiki.example.com`), not just a hostname.

### Step 5: Restart the agent and verify

1. Tell the user to restart / reload their agent so the new MCP config is picked up.
2. After restart, confirm that GROWI tools are visible (e.g. `suggestPath`, `searchPages`).
3. Run a lightweight read-only call (such as listing recent pages) to confirm the connection works end to end.

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
        "GROWI_BASE_URL_1": "${GROWI_BASE_URL_1}",
        "GROWI_API_TOKEN_1": "${GROWI_API_TOKEN_1}"
      }
    }
  }
}
```

> [!WARNING]
> Do not write the API token inline in this file. Use `${GROWI_API_TOKEN_1}` to read it from an environment variable, the same as in Step 4. Configs are easy to share or commit by accident.

All GROWI tools work this way, but every tool schema stays resident in the client context. This is fine for light use; for regular use, prefer the UTCP path above.

## Troubleshooting

- **Tools still not visible after restart** — re-check the `UTCP_CONFIG_FILE` path is absolute and the JSON is valid.
- **`Invalid environment variables` / "At least one GROWI app configuration is required"** — a `GROWI_*_n` trio is incomplete. Each app needs all three of `GROWI_APP_NAME_n`, `GROWI_BASE_URL_n`, `GROWI_API_TOKEN_n` set together (see Step 4).
- **Auth errors on a call** — verify the API token and Base URL; confirm the token has not been revoked in GROWI.
- **`npx` cannot find the package** — ensure Node.js 18+ is installed and the machine has network access.
