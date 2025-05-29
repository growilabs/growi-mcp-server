import type { FastMCP } from 'fastmcp';
import { isGrowiApiError } from '../../../commons/api/growi-api-error.js';
import { updatePageParamSchema } from './schema.js';
import { updatePage } from './service.js';

export function registerUpdatePageTool(server: FastMCP): void {
  server.addTool({
    name: 'updatePage',
    description: 'Update an existing page in GROWI',
    parameters: updatePageParamSchema,
    execute: async (params) => {
      try {
        const page = await updatePage(params);
        return JSON.stringify(page);
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new Error(`Failed to update page: [${error.statusCode}] ${error.message}${error.details != null ? `\n${JSON.stringify(error.details)}` : ''}`);
        }
        throw error;
      }
    },
  });
}
