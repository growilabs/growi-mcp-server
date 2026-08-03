import apiv3 from '@growi/sdk-typescript/v3';
import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { isGrowiApiError } from '../../../commons/api/growi-api-error.js';
import { trimRevisionForResponse } from '../../../commons/utils/growi-page.js';
import { resolveAppName } from '../../../commons/utils/resolve-app-name.js';
import { listRevisionsParamSchema } from './schema.js';

export function registerListRevisionsTool(server: FastMCP): void {
  server.addTool({
    name: 'listRevisions',
    description:
      'List revisions for a page in GROWI with pagination support. ' +
      'Revision bodies are omitted (bodyLength is returned instead); use getRevision for a specific revision body, or getRevisionDiffs to compare revisions.',
    parameters: listRevisionsParamSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      title: 'List Revisions',
    },
    execute: async (params) => {
      try {
        // Validate parameters
        const { appName, ...listRevisionsParams } = listRevisionsParamSchema.parse(params);
        const resolvedAppName = resolveAppName(appName);

        // Execute operation using SDK
        const result = await apiv3.getRevisionsList(listRevisionsParams, { appName: resolvedAppName });

        // Strip revision bodies: each revision otherwise carries a full copy of the page content
        const revisions = Array.isArray(result?.revisions) ? result.revisions.map((revision) => trimRevisionForResponse(revision)) : result?.revisions;

        return JSON.stringify({ ...result, revisions });
      } catch (error) {
        // Handle validation errors
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // Handle API errors
        if (isGrowiApiError(error)) {
          throw new UserError(`Failed to list revisions: ${error.message}`, {
            statusCode: error.statusCode,
            details: error.details,
          });
        }

        // Handle unexpected errors
        throw new UserError('The revision list operation could not be completed. Please try again later.', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
