import apiv3 from '@growi/sdk-typescript/v3';
import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { resolveAppName } from '../../../commons/utils/resolve-app-name.js';
import { getUserRecentPagesParamSchema } from './schema.js';

export function registerGetUserRecentPagesTool(server: FastMCP): void {
  server.addTool({
    name: 'getUserRecentPages',
    description: 'Get recently created pages by a specific user in GROWI',
    parameters: getUserRecentPagesParamSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      title: 'Get User Recent Pages',
    },
    execute: async (params) => {
      try {
        // Validate parameters
        const { appName, ...getUserRecentPagesParams } = getUserRecentPagesParamSchema.parse(params);
        const resolvedAppName = resolveAppName(appName);

        // Execute operation using SDK
        const result = await apiv3.getRecentByIdForUsers(getUserRecentPagesParams.userId, { appName: resolvedAppName });

        return JSON.stringify(result);
      } catch (error) {
        // Handle validation errors
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // Handle unexpected errors
        throw new UserError('Failed to get user recent pages', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
