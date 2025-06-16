- [日本語 🇯🇵](./README_JP.md)

# @growi/mcp-server

[![npm version](https://badge.fury.io/js/%40growi%2Fmcp-server.svg)](https://badge.fury.io/js/%40growi%2Fmcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server that connects AI models to GROWI wiki content. Enables LLMs to search and retrieve information from your organization's knowledge base for accurate, context-aware responses.

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

```json
{
  "mcpServers": {
    "growi": {
      "command": "npx",
      "args": ["@growi/mcp-server"],
      "env": {
        "GROWI_BASE_URL": "https://your-growi-instance.com",
        "GROWI_API_TOKEN": "your_growi_api_token"
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
| `GROWI_BASE_URL` | ✅ | Base URL of GROWI instance | - |
| `GROWI_API_TOKEN` | ✅ | GROWI API access token | - |


## Developer Information

### Requirements
- Node.js 18 or higher
- pnpm (recommended)
- GROWI instance (for development and testing)

### Getting Started

1. Clone the repository
```bash
git clone https://github.com/weseek/growi-mcp-server.git
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

# Run in production
pnpm start
```

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
1. **Issue Reports**: Bug reports and feature requests via [GitHub Issues](https://github.com/weseek/growi-mcp-server/issues)
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
- **[GROWI SDK TypeScript](https://github.com/weseek/growi-sdk-typescript)** - GROWI API TypeScript SDK
- **[FastMCP](https://github.com/punkpeye/fastmcp)** - MCP server development framework

---

**Notice**

This MCP server is under development. APIs may change without notice. Please test thoroughly before using in production environments.
