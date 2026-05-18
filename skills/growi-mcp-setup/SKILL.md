---
name: growi-mcp-setup
description: |
  Set up and connect the GROWI MCP server so GROWI tools become available to the agent. Use this skill when the user asks to "set up GROWI", "connect GROWI", "configure the GROWI MCP server", or when GROWI tools (such as suggestPath, searchPages, createPage) are expected but not available. Also use this right after the user has installed the GROWI plugin/skill and needs to finish wiring up the connection.
---

# GROWI MCP Setup: Connection Bootstrap Workflow

Guide the user from "the skill is installed" to "GROWI tools actually work", by setting up UTCP Code-Mode and verifying the connection.

## Scope

This skill covers the gap **after** the user has installed the GROWI plugin/skill (and restarted their agent) and **before** GROWI tools are usable.

Installation itself (adding the marketplace, installing the plugin, restarting the agent) is the user's responsibility — it cannot be automated, because the agent cannot act until the skill is recognized. Assume the user has already done that when this skill runs.

## Why UTCP Code-Mode

The GROWI MCP server exposes ~20 tools. Loading every tool schema into the client context is heavy on tokens. UTCP Code-Mode sits between the client and the GROWI MCP server and lets the agent call tools through a single code-execution interface, which keeps context small.

The recommended path is **UTCP Code-Mode**. A direct MCP connection also works (all tools function), but is only suggested as a fallback or for light use — see the last section.

## Workflow

### Step 1: Collect GROWI connection info

Ask the user for:

- **Base URL** of their GROWI instance (e.g. `https://wiki.example.com`)
- **API token** — issued from GROWI: User Settings → API Token
- **App name** — a short identifier the user picks (e.g. `main`)

### Step 2: Check / install UTCP Code-Mode

UTCP Code-Mode runs via `npx`, so no separate install is required. It is registered as an MCP server in the client config.

### Step 3: Register UTCP Code-Mode in the client config

Register a `code-mode` MCP server in the client's MCP config. How to do this depends on the client.

**Claude Code** — edit the config file, or use the `claude mcp add` CLI:

- User / Local scope: `~/.claude.json`
- Project scope: `.mcp.json` at the project root (supports `${VAR}` expansion)

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

### Step 5: Restart the agent and verify

1. Tell the user to restart / reload their agent so the new MCP config is picked up.
2. After restart, confirm that GROWI tools are visible (e.g. `suggestPath`, `searchPages`).
3. Run a lightweight read-only call (such as listing recent pages) to confirm the connection works end to end.

If tools are visible and a call succeeds, setup is complete — the user can now use workflows like `growi-smart-save`.

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
        "GROWI_BASE_URL_1": "https://your-growi-instance.com",
        "GROWI_API_TOKEN_1": "your_growi_api_token"
      }
    }
  }
}
```

All GROWI tools work this way, but every tool schema stays resident in the client context. This is fine for light use; for regular use, prefer the UTCP path above.

## Troubleshooting

- **Tools still not visible after restart** — re-check the `UTCP_CONFIG_FILE` path is absolute and the JSON is valid.
- **Auth errors on a call** — verify the API token and Base URL; confirm the token has not been revoked in GROWI.
- **`npx` cannot find the package** — ensure Node.js 18+ is installed and the machine has network access.
