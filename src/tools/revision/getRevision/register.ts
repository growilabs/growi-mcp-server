import apiv3 from '@growi/sdk-typescript/v3';
import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { getRevisionParamSchema } from './schema.js';

export function registerGetRevisionTool(server: FastMCP): void {
  server.addTool({
    name: 'getRevision',
    description: 'Get detailed information about a specific revision in GROWI',
    parameters: getRevisionParamSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      title: 'Get Revision Details',
    },
    execute: async (params) => {
      try {
        // Validate parameters
        const validatedParams = getRevisionParamSchema.parse(params);

        // Execute operation using SDK
        const result = await apiv3.getRevisionsById(validatedParams.id, { pageId: validatedParams.pageId });

        return JSON.stringify(result);
      } catch (error) {
        // Handle validation errors
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // Handle unexpected errors
        throw new UserError('Failed to get revision details', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
