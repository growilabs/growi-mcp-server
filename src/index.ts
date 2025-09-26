#!/usr/bin/env node

import { FastMCP } from 'fastmcp';

import { growiClientManager } from './commons/api/growi-client-manager';
import config from './config/default.js';

const server = new FastMCP({
  name: 'growi-mcp-server',
  version: '1.0.0',
});

async function main(): Promise<void> {
  await growiClientManager.init(config.growi.apps, config.growi.defaultAppName);

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
