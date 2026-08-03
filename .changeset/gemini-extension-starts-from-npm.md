---
'@growi/mcp-server': patch
---

Fix the Gemini CLI extension so that the MCP server actually starts.

The extension manifest pointed at `dist/index.js` inside the extension directory, but that build output is never distributed: installing from a GitHub URL fetches the release's source archive, which does not contain it. Installation reported success while the GROWI tools stayed unavailable, and only the bundled skills worked.

The extension now starts the server from npm with a pinned version, so it no longer depends on a build artifact that is not shipped. The pinned version, the extension's displayed version, and the Claude Code plugin version are all derived from the package version at release time.
