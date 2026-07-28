import apiv3 from '@growi/sdk-typescript/v3';
import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { isGrowiApiError } from '../../../commons/api/growi-api-error.js';
import { resolveAppName } from '../../../commons/utils/resolve-app-name.js';
import { listRevisionChangesParamSchema } from './schema.js';

export function registerListRevisionChangesTool(server: FastMCP): void {
  server.addTool({
    name: 'listRevisionChanges',
    description:
      "List the authenticated user's consecutive-edit runs across all pages in GROWI. Each entry includes the baseline (from) and final (to) revision of the run with page accessibility flags, ordered for stable incremental sync with cursor pagination",
    parameters: listRevisionChangesParamSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      title: 'List Revision Changes',
    },
    execute: async (params) => {
      try {
        // Validate parameters
        const { appName, ...listRevisionChangesParams } = listRevisionChangesParamSchema.parse(params);
        const resolvedAppName = resolveAppName(appName);

        // Execute operation using SDK
        const result = await apiv3.getChangesForRevisions(listRevisionChangesParams, { appName: resolvedAppName });

        return JSON.stringify(result);
      } catch (error) {
        // Handle validation errors
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // Handle API errors
        if (isGrowiApiError(error)) {
          throw new UserError(`Failed to list revision changes: ${error.message}`, {
            statusCode: error.statusCode,
            details: error.details,
          });
        }

        // Handle unexpected errors
        throw new UserError('The revision changes list operation could not be completed. Please try again later.', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
