---
'@growi/mcp-server': patch
---

Report the real package version to MCP clients instead of a hardcoded `1.0.0`.

The server passed a literal `'1.0.0'` as the `version` field when constructing the FastMCP instance, so every connected client saw that fixed string regardless of which package version was actually running. Anyone checking a client's MCP connection details to confirm which release was live had no way to tell.

The version is now read from `package.json` at build time, so it always matches the published package version.
