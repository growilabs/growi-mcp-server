---
'@growi/mcp-server': patch
---

Update `@growi/sdk-typescript` to 1.13.0, refreshing the generated GROWI API bindings against a newer OpenAPI spec.

No tool changes its inputs or outputs. The SDK renamed its generated symbols across the board, so the call sites inside this server were renamed to match, but every response type this server reads is unchanged field for field.
