import apiv3 from '@growi/sdk-typescript/v3';
import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { isGrowiApiError } from '../../../commons/api/growi-api-error.js';
import { resolveAppName } from '../../../commons/utils/resolve-app-name.js';
import { updatePageParamSchema } from './schema.js';

export function registerUpdatePageTool(server: FastMCP): void {
  server.addTool({
    name: 'updatePage',
    description: 'Update an existing page in GROWI',
    parameters: updatePageParamSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
    },
    execute: async (params) => {
      try {
        // Validate parameters
        const { appName, ...updatePageParams } = updatePageParamSchema.parse(params);
        const resolvedAppName = resolveAppName(appName);

        // Execute update operation using SDK
        const result = await apiv3.putPage(updatePageParams, { appName: resolvedAppName });

        if (!result?.page) {
          throw new UserError('Failed to retrieve page data after update');
        }

        return JSON.stringify(result.page);
      } catch (error) {
        // Handle validation errors
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // Handle API errors
        if (isGrowiApiError(error)) {
          throw new UserError('Failed to update page', {
            statusCode: error.statusCode,
            details: error.details,
          });
        }

        // Handle unexpected errors
        throw new UserError('The page update operation could not be completed. Please try again later.', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
