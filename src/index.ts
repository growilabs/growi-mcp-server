import 'dotenv/config';
import config from 'config';
import type { Config } from './config/types';

// CommonJSスタイルのimportを使用（fastmcpの型定義の問題のため）
const fastmcp = require('fastmcp');
const healthRoutes = require('./routes/health').default;

async function main(): Promise<void> {
  try {
    // Create MCP server instance
    const server = new fastmcp.Server({
      name: 'growi-mcp-server',
      description: 'GROWI MCP Server for AI model integration',
      port: config.get('server.port') as Config['server']['port'],
    });

    // Register routes
    server.use(healthRoutes);

    // Start server
    await server.start();
    console.log(`Server is running on port ${config.get('server.port') as Config['server']['port']}`);
  } catch (error) {
    console.error('Failed to start server:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
