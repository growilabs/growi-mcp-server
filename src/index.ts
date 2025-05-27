#!/usr/bin/env node

import 'reflect-metadata';
import { FastMCP } from 'fastmcp';

// Import services to register them with tsyringe
import './services/index.js';

const server = new FastMCP({
  name: 'growi-mcp-server',
  version: '1.0.0',
});

async function main(): Promise<void> {
  try {
    // Loaders are imported dynamically so that the module will be garbage collected
    const { loadTools } = await import('./tools/index.js');
    const { loadResources } = await import('./resources/index.js');
    const { loadPrompts } = await import('./prompts/index.js');
    await loadTools(server);
    await loadResources(server);
    await loadPrompts(server);

    await server.start({
      transportType: 'stdio',
    });
  } catch (error) {
    console.error('Failed to start server:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
