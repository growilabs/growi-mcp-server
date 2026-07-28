#!/usr/bin/env node

import { axiosInstanceManager } from '@growi/sdk-typescript';
import { FastMCP } from 'fastmcp';
import { buildBasicAuthHeader } from './commons/utils/build-basic-auth-header.js';
import type { GrowiAppConfig } from './config/types.js';
import { isVaultCommand, runVaultCommand } from './vault/cli.js';

const server = new FastMCP({
  name: 'growi-mcp-server',
  version: '1.0.0',
});

/**
 * Initialize Axios instances for all GROWI apps.
 */
const setupAxiosInstance = async (apps: Map<string, GrowiAppConfig>): Promise<void> => {
  Array.from(apps.values()).map((app) => {
    // When HTTP auth is configured, the proxy credentials go in the Authorization header and the
    // SDK moves the GROWI API token to X-GROWI-ACCESS-TOKEN. Without it, the SDK keeps the default
    // Bearer scheme, so existing setups are unaffected.
    const authorizationHeader = app.httpAuth != null ? buildBasicAuthHeader(app.httpAuth.username, app.httpAuth.password) : undefined;

    axiosInstanceManager.addAxiosInstance({
      appName: app.name,
      baseURL: app.baseUrl,
      token: app.apiToken,
      ...(authorizationHeader != null ? { authorizationHeader } : {}),
    });
  });
};

async function main(): Promise<void> {
  // Imported here rather than at module scope because loading it validates the environment and
  // throws when no GROWI app is configured. A subcommand such as vault-decode needs no
  // configuration at all, so that check must not run before the argv dispatch below.
  const { default: config } = await import('./config/default.js');
  setupAxiosInstance(config.growi.apps);

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

const [subcommand, ...subcommandArgs] = process.argv.slice(2);

if (isVaultCommand(subcommand)) {
  // A Vault subcommand is a one-shot CLI run against the same configuration the server uses, so it
  // must not go on to occupy stdio with an MCP session.
  runVaultCommand(subcommand, subcommandArgs)
    .then((exitCode) => process.exit(exitCode))
    .catch((error) => {
      console.error(`${subcommand}: error:`, error instanceof Error ? error.message : String(error));
      process.exit(2);
    });
} else {
  main().catch((error) => {
    console.error('Unhandled error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
