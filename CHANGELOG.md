# @growi/mcp-server

## 1.7.1

### Patch Changes

- [#36](https://github.com/growilabs/growi-mcp-server/pull/36) [`3f6534e`](https://github.com/growilabs/growi-mcp-server/commit/3f6534ed36075827cd8acf201efe4fbfc3741578) Thanks [@yuki-takei](https://github.com/yuki-takei)! - Fix the Gemini CLI extension so that the MCP server actually starts.

  The extension manifest pointed at `dist/index.js` inside the extension directory, but that build output is never distributed: installing from a GitHub URL fetches the release's source archive, which does not contain it. Installation reported success while the GROWI tools stayed unavailable, and only the bundled skills worked.

  The extension now starts the server from npm with a pinned version, so it no longer depends on a build artifact that is not shipped. The pinned version, the extension's displayed version, and the Claude Code plugin version are all derived from the package version at release time.

- [#37](https://github.com/growilabs/growi-mcp-server/pull/37) [`0697765`](https://github.com/growilabs/growi-mcp-server/commit/0697765e8065cc3ebc097905a22105fdb6f3a9df) Thanks [@yuki-takei](https://github.com/yuki-takei)! - Update `@growi/sdk-typescript` to 1.14.0, which restores the generated symbol names that 1.13.0 had renamed.

  No call site changes: 1.14.0's generated names are identical to 1.12.0's, so the code already matches. The declared range is raised to `^1.14.0` because `^1.12.0` still resolved to the broken 1.13.0, whose symbol names came from the HTTP method and path rather than `operationId`.

- [#36](https://github.com/growilabs/growi-mcp-server/pull/36) [`4440911`](https://github.com/growilabs/growi-mcp-server/commit/4440911fdd415252ecb56a7303c545c5a3cb4c0b) Thanks [@yuki-takei](https://github.com/yuki-takei)! - Report the real package version to MCP clients instead of a hardcoded `1.0.0`.

  The server passed a literal `'1.0.0'` as the `version` field when constructing the FastMCP instance, so every connected client saw that fixed string regardless of which package version was actually running. Anyone checking a client's MCP connection details to confirm which release was live had no way to tell.

  The version is now read from `package.json` at build time, so it always matches the published package version.
