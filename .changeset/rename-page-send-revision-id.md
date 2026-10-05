---
'@growi/mcp-server': patch
---

`renamePage` now sends `revisionId` to `PUT /pages/rename`, which the server requires for non-empty pages. It uses the `revisionId` argument when given and otherwise fetches the latest revision of the page. Previously the field was never sent, so renaming a non-empty page was rejected with `invalid_body`.
