# growi-mcp-server
A Model Context Protocol (MCP) server that connects AI models to GROWI wiki content. Enables LLMs to search and retrieve information from your organization's knowledge base for accurate, context-aware responses.


## Dev

# 共有ネットワークを作成
docker network create dev-network

# 既存のdevcontainerを新しいネットワークに接続
docker network connect dev-network devcontainer1
docker network connect dev-network devcontainer2
