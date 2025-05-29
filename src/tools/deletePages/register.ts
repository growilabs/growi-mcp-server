import type { FastMCP } from 'fastmcp';
import { isGrowiApiError } from '../../commons/api/growi-api-error.js';
import { deletePagesParamSchema } from './schema.js';
import { deletePages } from './service.js';

export function registerDeletePagesTool(server: FastMCP): void {
  server.addTool({
    name: 'deletePages',
    description: 'Delete pages in GROWI',
    parameters: deletePagesParamSchema,
    execute: async (args) => {
      const params = deletePagesParamSchema.parse(args);
      try {
        const response = await deletePages(params);
        return JSON.stringify(response);
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new Error(`Failed to delete pages: [${error.statusCode}] ${error.message}${error.details != null ? `\n${JSON.stringify(error.details)}` : ''}`);
        }
        throw error;
      }
    },
  });
}
