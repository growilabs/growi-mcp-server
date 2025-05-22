#!/usr/bin/env node

import { FastMCP } from 'fastmcp';
import { loadPrompts } from './prompts/index.js';
import { loadResources } from './resources/index.js';
import { loadTools } from './tools/index.js';

const server = new FastMCP({
  name: 'growi-mcp-server',
  version: '1.0.0',
});

async function main(): Promise<void> {
  await loadTools(server);
  await loadResources(server);
  await loadPrompts(server);

  try {
    await server.start({
      transportType: 'stdio',
    });
    console.log('GROWI MCP Server started successfully.');
  } catch (error) {
    console.error('Failed to start server:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
