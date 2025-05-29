import type { FastMCP } from 'fastmcp';
import { isGrowiApiError } from '../../commons/api/growi-api-error.js';
import { getPageTagParamSchema } from './schema.js';
import { getPageTag } from './service.js';

export function registerGetPageTagTool(server: FastMCP): void {
  server.addTool({
    name: 'getPageTag',
    description: 'Get page tags from GROWI',
    parameters: getPageTagParamSchema,
    execute: async (args) => {
      const params = getPageTagParamSchema.parse(args);
      try {
        const response = await getPageTag(params);
        return JSON.stringify(response);
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new Error(
            `Failed to get page tags: [${error.statusCode}] ${error.message}${error.details != null ? `\n${JSON.stringify(error.details)}` : ''}`,
          );
        }
        throw error;
      }
    },
  });
}
