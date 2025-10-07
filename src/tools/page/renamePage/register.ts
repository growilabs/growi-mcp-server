import { type FastMCP, UserError } from 'fastmcp';
import { z } from 'zod';
import { isGrowiApiError } from '../../../commons/api/growi-api-error.js';
import { resolveAppName } from '../../../commons/utils/resolve-app-name.js';
import { renamePageParamSchema } from './schema.js';
import { renamePage } from './service.js';

export function registerRenamePageTool(server: FastMCP): void {
  server.addTool({
    name: 'renamePage',
    description: 'Rename or move a page in GROWI',
    parameters: renamePageParamSchema,
    execute: async (params) => {
      try {
        // Validate parameters
        const { appName, ...renamePageParams } = renamePageParamSchema.parse(params);
        const resolvedAppName = resolveAppName(appName);

        // Call service
        const page = await renamePage(renamePageParams, resolvedAppName);
        return JSON.stringify(page);
      } catch (error) {
        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // Handle API errors
        if (isGrowiApiError(error)) {
          throw new UserError(`Failed to rename page: ${error.message}`, {
            statusCode: error.statusCode,
            details: error.details,
          });
        }

        // Handle unexpected errors
        throw new UserError('A system error occurred. Please contact the administrator.');
      }
    },
  });
}
