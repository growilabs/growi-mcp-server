import type { FastMCP } from 'fastmcp';
import { isGrowiApiError } from '../../commons/api/growi-api-error.js';
import { getRootPagesParamSchema } from './schema.js';
import { getRootPages } from './service.js';

export function registerGetRootPagesTool(server: FastMCP): void {
  server.addTool({
    name: 'getRootPages',
    description: 'Get list of root pages from GROWI',
    parameters: getRootPagesParamSchema,
    execute: async (args) => {
      const params = getRootPagesParamSchema.parse(args);
      try {
        const response = await getRootPages(params);
        return JSON.stringify(response);
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new Error(
            `Failed to get root pages: [${error.statusCode}] ${error.message}${error.details != null ? `\n${JSON.stringify(error.details)}` : ''}`,
          );
        }
        throw error;
      }
    },
  });
}
