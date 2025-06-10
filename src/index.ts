#!/usr/bin/env node

import 'reflect-metadata';
import { FastMCP } from 'fastmcp';

import config from './config/default.js';

const server = new FastMCP({
  name: 'growi-mcp-server',
  version: '1.0.0',
});

/**
 * Sets up the default Axios instance for GROWI API requests.
 */
const setupDefaultAxiosInstance = async () => {
  const { AXIOS_DEFAULT } = await import('@growi/sdk-typescript');
  AXIOS_DEFAULT.setBaseURL(config.growi.baseUrl);
  AXIOS_DEFAULT.setAuthorizationHeader(config.growi.apiToken);
};

async function main(): Promise<void> {
  await setupDefaultAxiosInstance();

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
