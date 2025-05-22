# growi-mcp-server
A Model Context Protocol (MCP) server that connects AI models to GROWI wiki content. Enables LLMs to search and retrieve information from your organization's knowledge base for accurate, context-aware responses.


## 開発スタートアップ

1. GROWI 本体開発用 devcontainer のデフォルトネットワークに接続
    docker network connect growi_devcontainer_default growi-mcp-server-dev

1. `.env.local`
    GROWI_BASE_URL=http://app:3000
    GROWI_API_TOKEN=your_growi_api_token
