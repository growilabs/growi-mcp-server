import apiv3 from '@growi/sdk-typescript/v3';
import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { resolveAppName } from '../../../commons/utils/resolve-app-name.js';
import { deleteShareLinkByIdParamSchema } from './schema.js';

export function registerDeleteShareLinkByIdTool(server: FastMCP): void {
  server.addTool({
    name: 'deleteShareLinkById',
    description: 'Delete a specific share link by ID in GROWI',
    parameters: deleteShareLinkByIdParamSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
      title: 'Delete Share Link by ID',
    },
    execute: async (params) => {
      try {
        // Validate parameters
        const { appName, ...deleteShareLinkByIdParams } = deleteShareLinkByIdParamSchema.parse(params);
        const resolvedAppName = resolveAppName(appName);

        // Execute operation using SDK
        const result = await apiv3.deleteShareLinksById(deleteShareLinkByIdParams.id, { appName: resolvedAppName });

        return JSON.stringify(result);
      } catch (error) {
        // Handle validation errors
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // Handle unexpected errors
        throw new UserError('Failed to delete share link by ID', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
