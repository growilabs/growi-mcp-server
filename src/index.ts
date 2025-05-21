#!/usr/bin/env node

import 'dotenv-flow/config';
import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import config from './config/default';
import { GrowiService } from './services/growi-service';

console.log('[index.ts] Initializing FastMCP instance');

const server = new FastMCP({
  name: 'growi-mcp-server',
  version: '1.0.0',
});

console.log('[index.ts] Initializing GrowiService...');
const growiService = new GrowiService();
console.log('[index.ts] GrowiService initialized.');

// Define parameter schema
const getPageSchema = z.object({
  pagePath: z.string().describe('Path of the page to retrieve'),
});

// Add tool to retrieve GROWI page
server.addTool({
  name: 'getPage',
  description: 'Get page information from GROWI',
  parameters: getPageSchema,
  execute: async (args) => {
    const { pagePath } = getPageSchema.parse(args);
    try {
      const page = await growiService.getPage(pagePath);
      return JSON.stringify(page);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get page: ${error.message}`);
      }
      throw error;
    }
  },
});

// Start server
async function main(): Promise<void> {
  try {
    await server.start({
      transportType: 'httpStream',
      httpStream: {
        port: config.server.port,
      },
    });
    console.log('MCP Server is running');
  } catch (error) {
    console.error('Failed to start server:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
