import type { FastMCP } from 'fastmcp';
import { isGrowiApiError } from '../../commons/api/growi-api-error.js';
import { getPageParamSchema } from './schema.js';
import { getPage } from './service.js';

export function registerGetPageTool(server: FastMCP): void {
  server.addTool({
    name: 'getPage',
    description: 'Get page information from GROWI',
    parameters: getPageParamSchema,
    execute: async (args) => {
      const params = getPageParamSchema.parse(args);
      try {
        const page = await getPage(params);
        return JSON.stringify(page);
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new Error(`Failed to get page: [${error.statusCode}] ${error.message}${error.details != null ? `\n${JSON.stringify(error.details)}` : ''}`);
        }
        throw error;
      }
    },
  });
}
