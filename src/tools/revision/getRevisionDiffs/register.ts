import apiv3 from '@growi/sdk-typescript/v3';
import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { isGrowiApiError } from '../../../commons/api/growi-api-error.js';
import { resolveAppName } from '../../../commons/utils/resolve-app-name.js';
import { getRevisionDiffsParamSchema } from './schema.js';

export function registerGetRevisionDiffsTool(server: FastMCP): void {
  server.addTool({
    name: 'getRevisionDiffs',
    description:
      'Compute unified diffs for a batch of revision pairs (up to 20) in GROWI. Authorization is checked independently per pair: inaccessible pairs return status "forbidden" and structurally invalid pairs return status "invalid" without failing the whole batch',
    parameters: getRevisionDiffsParamSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      title: 'Get Revision Diffs',
    },
    execute: async (params) => {
      try {
        // Validate parameters
        const { appName, ...getRevisionDiffsParams } = getRevisionDiffsParamSchema.parse(params);
        const resolvedAppName = resolveAppName(appName);

        // Execute operation using SDK
        const result = await apiv3.postDiffForRevisions(getRevisionDiffsParams, { appName: resolvedAppName });

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
          throw new UserError(`Failed to get revision diffs: ${error.message}`, {
            statusCode: error.statusCode,
            details: error.details,
          });
        }

        // Handle unexpected errors
        throw new UserError('The revision diff operation could not be completed. Please try again later.', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
