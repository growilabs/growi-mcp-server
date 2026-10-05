---
'@growi/mcp-server': minor
---

`getComments` now returns inline comments as well as regular comments. It calls the apiv3 `GET /comments` endpoint (SDK `apiv3.getComments`) instead of the deprecated `/comments.get`, which returned regular comments only. Each item has an `isInline` field to tell the two kinds apart.
