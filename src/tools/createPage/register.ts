import type { FastMCP } from 'fastmcp';
import { isGrowiApiError } from '../../commons/api/growi-api-error.js';
import { createPageParamSchema } from './schema.js';
import { createPage } from './service.js';

export function registerCreatePageTool(server: FastMCP): void {
  server.addTool({
    name: 'createPage',
    description: 'Create a new page in GROWI',
    parameters: createPageParamSchema,
    execute: async (args) => {
      const params = createPageParamSchema.parse(args);
      try {
        const page = await createPage(params);
        return JSON.stringify(page);
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new Error(`Failed to create page: [${error.statusCode}] ${error.message}${error.details != null ? `\n${JSON.stringify(error.details)}` : ''}`);
        }
        throw error;
      }
    },
  });
}
