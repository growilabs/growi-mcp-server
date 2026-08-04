---
'@growi/mcp-server': patch
---

Update `@growi/sdk-typescript` to 1.14.0, which restores the generated symbol names that 1.13.0 had renamed.

No call site changes: 1.14.0's generated names are identical to 1.12.0's, so the code already matches. The declared range is raised to `^1.14.0` because `^1.12.0` still resolved to the broken 1.13.0, whose symbol names came from the HTTP method and path rather than `operationId`.
