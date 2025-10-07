- [日本語 🇯🇵](./README_JP.md)

# @growi/mcp-server

[![npm version](https://badge.fury.io/js/%40growi%2Fmcp-server.svg)](https://badge.fury.io/js/%40growi%2Fmcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server that connects AI models to GROWI wiki content. Enables LLMs to search and retrieve information from your organization's knowledge base for accurate, context-aware responses. Supports connections to multiple GROWI apps.

## Key Features

- 🔍 **GROWI page search and retrieval**
- 📝 **Page management**
- 🏷️ **Tag management**
- 📋 **Comment management**
- 🔗 **Share link management**

## Supported GROWI Versions

- GROWI v7.3.x or higher recommended
    - *GROWI v7.3.x is scheduled for release in 2025Q2
- Some features are available on GROWI v7.2.x and below
- [GROWI API](https://docs.growi.org/en/api/)


## MCP Server Configuration

Supports simultaneous connections to multiple GROWI apps. Each app is configured using numbered environment variables.

### Single App Configuration Example
```json
{
  "mcpServers": {
    "growi": {
      "command": "npx",
      "args": ["@growi/mcp-server"],
      "env": {
        "GROWI_APP_NAME_1": "main",
        "GROWI_BASE_URL_1": "https://your-growi-instance.com",
        "GROWI_API_TOKEN_1": "your_growi_api_token"
      }
    }
  }
}
```

### Multiple Apps Configuration Example
```json
{
  "mcpServers": {
    "growi": {
      "command": "npx",
      "args": ["@growi/mcp-server"],
      "env": {
        "GROWI_DEFAULT_APP_NAME": "staging",

        "GROWI_APP_NAME_1": "production",
        "GROWI_BASE_URL_1": "https://wiki.example.com",
        "GROWI_API_TOKEN_1": "token_for_production",

        "GROWI_APP_NAME_2": "staging",
        "GROWI_BASE_URL_2": "https://wiki-staging.example.com",
        "GROWI_API_TOKEN_2": "token_for_staging",
        
        "GROWI_APP_NAME_3": "development",
        "GROWI_BASE_URL_3": "https://wiki-dev.example.com",
        "GROWI_API_TOKEN_3": "token_for_development"
      }
    }
  }
}
```

## Available Tools (Features)

### Page Management
- `searchPages` - Search pages by keywords
- `createPage` - Create a new page
- `updatePage` - Update an existing page
- `deletePages` - Delete pages (bulk operation supported)
- `duplicatePage` - Duplicate a page (including child pages)
- `renamePage` - Change page name and path
- `getPage` - Get a page data
- `getPageInfo` - Get detailed page information
- `getRecentPages` - Get list of recently updated pages
- `getPageListingRoot` - Get root page list
- `getPageListingChildren` - Get child pages of specified page
- `pageListingInfo` - Get summary information of page listings
- `publishPage` / `unpublishPage` - Set page publish/unpublish status

### Tag Management
- `getPageTag` - Get tags of a page
- `updateTag` - Update tags of a page
- `getTagList` - Get list of tags
- `searchTags` - Search tags

### Comments & Discussions
- `getComments` - Get comments of a page

### Revision Management
- `listRevisions` - Get page edit history
- `getRevision` - Get details of a specific revision

### Share Links
- `createShareLink` - Create a share link
- `getShareLinks` - Get share links of a page
- `deleteShareLinks` - Delete share links
- `deleteShareLinkById` - Delete a specific share link

### User Information
- `getUserRecentPages` - Get recent pages of a specific user


## Configuration Options

### Environment Variables

| Variable Name | Required | Description | Default Value |
|---------------|----------|-------------|---------------|
| `GROWI_APP_NAME_{N}` | ✅ | GROWI app identifier name (N is an integer) | - |
| `GROWI_BASE_URL_{N}` | ✅ | Base URL of GROWI instance (N is an integer) | - |
| `GROWI_API_TOKEN_{N}` | ✅ | GROWI API access token (N is an integer) | - |
| `GROWI_DEFAULT_APP_NAME` | ❌ | Default app name to use | First configured app |

### Multiple Apps Configuration Notes
- Use integer values (1, 2, 3...) for each app configuration (sequential numbering is not required)
- Combination of `GROWI_APP_NAME_N`, `GROWI_BASE_URL_N`, and `GROWI_API_TOKEN_N` is required
- App names, base URLs, and API tokens must each be unique
- If `GROWI_DEFAULT_APP_NAME` is omitted, the first configured app becomes the default
- The app specified in `GROWI_DEFAULT_APP_NAME` will be used as the default app when the LLM does not explicitly include an app name in the prompt


## Developer Information

### Requirements
- Node.js 18 or higher
- pnpm (recommended)
- GROWI instance (for development and testing)

### Getting Started

1. Clone the repository
```bash
git clone https://github.com/growilabs/growi-mcp-server.git
cd growi-mcp-server
```

2. Install dependencies
```bash
pnpm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
# Edit .env.local to enter GROWI connection information
```

4. Start the development server
```bash
# Test with MCP CLI
pnpm dev:cli

# Develop with MCP Inspector
pnpm dev:inspect
```

### Build and Test
```bash
# Build
pnpm build

# Lint
pnpm lint

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run in production
pnpm start
```

### MCP Server Configuration

1. Build
```bash
pnpm build
```

2. MCP Server Configuration (Single App)
```json
{
  "mcpServers": {
    "growi": {
      "command": "node",
      "args": ["/Users/username/projects/growi-mcp-server/dist/index.js"],
      "env": {
        "GROWI_APP_NAME_1": "main",
        "GROWI_BASE_URL_1": "https://your-growi-instance.com",
        "GROWI_API_TOKEN_1": "your_growi_api_token"
      }
    }
  }
}
```

3. MCP Server Configuration (Multiple Apps)
```json
{
  "mcpServers": {
    "growi": {
      "command": "node",
      "args": ["/Users/username/projects/growi-mcp-server/dist/index.js"],
      "env": {
        "GROWI_DEFAULT_APP_NAME": "production",

        "GROWI_APP_NAME_1": "production",
        "GROWI_BASE_URL_1": "https://wiki.example.com",
        "GROWI_API_TOKEN_1": "production_token",

        "GROWI_APP_NAME_2": "staging",
        "GROWI_BASE_URL_2": "https://wiki-staging.example.com",
        "GROWI_API_TOKEN_2": "staging_token"
      }
    }
  }
}
```

> [!NOTE]
> Set the absolute path to the built output in "args"

### Troubleshooting

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


### Contributing

Contributions to the project are welcome!

#### How to Contribute
1. **Issue Reports**: Bug reports and feature requests via [GitHub Issues](https://github.com/growilabs/growi-mcp-server/issues)
2. **Pull Requests**:
   - Fork and create a branch
   - Implement changes
   - Add tests (if applicable)
   - Create a pull request

#### Development Guidelines
- **Coding Standards**: Use [Biome](https://biomejs.dev/)
- **Commit Messages**: Follow [Conventional Commits](https://www.conventionalcommits.org/)

## License

This project is released under the [MIT License](./LICENSE).

---

## Related Links

- **[GROWI Official Site](https://growi.org/)** - Open source wiki platform
- **[Model Context Protocol](https://modelcontextprotocol.io/)** - Standard protocol for AI and tool integration
- **[GROWI SDK TypeScript](https://github.com/growilabs/growi-sdk-typescript)** - GROWI API TypeScript SDK
- **[FastMCP](https://github.com/punkpeye/fastmcp)** - MCP server development framework

---

**Notice**

This MCP server is under development. APIs may change without notice. Please test thoroughly before using in production environments.
