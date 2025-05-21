# growi-mcp-server
A Model Context Protocol (MCP) server that connects AI models to GROWI wiki content. Enables LLMs to search and retrieve information from your organization's knowledge base for accurate, context-aware responses.


## 開発スタートアップ

1. 共有ネットワークを作成
    docker network create growi-mcp-dev-network

1. 既存のdevcontainerを新しいネットワークに接続
    docker network connect growi-mcp-dev-network growi_devcontainer-app-1
    docker network connect growi-mcp-dev-network <growi-mcp-server>

1. `.env.local`
    GROWI_BASE_URL=http://growi_devcontainer-app-1:3000
    GROWI_API_TOKEN=your_growi_api_token
