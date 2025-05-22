# growi-mcp-server
A Model Context Protocol (MCP) server that connects AI models to GROWI wiki content. Enables LLMs to search and retrieve information from your organization's knowledge base for accurate, context-aware responses.


## Get Started with MCP Server development

1. Get an access token from your GROWI and add `.env.local`
    ```properties
    GROWI_BASE_URL=http://app:3000
    GROWI_API_TOKEN=your_growi_api_token
    ```

## Troubleshooting

### When unable to connect to GROWI
1. Check connectivity
    ```bash
    curl -v http://app:3000/_api/v3/healthcheck
    ```
2. If the `app` hostname cannot be resolved, check the devcontainer network and verify it includes `growi_devcontainer_default`
    - The `.devcontainer/devcontainer.json` file sets `--network` in `runArgs`, so rebuilding the container should apply this setting
    - To add manually, run the following:
        - Run `docker network` command on the docker host machine
        ```bash
        docker network connect growi_devcontainer_default growi-mcp-server-dev
        ```
