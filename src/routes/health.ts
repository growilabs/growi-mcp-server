import type { IncomingMessage, ServerResponse } from 'node:http';

// CommonJSスタイルのimportを使用
const fastmcp = require('fastmcp');
const router = fastmcp.Router();

// Health check endpoint
router.get('/health', (_req: IncomingMessage, res: ServerResponse) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'growi-mcp-server',
    }),
  );
});

export default router;
