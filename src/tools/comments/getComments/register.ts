import apiv1 from '@growi/sdk-typescript/v1';
import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { getCommentsParamSchema } from './schema.js';

export function registerGetCommentsTool(server: FastMCP): void {
  server.addTool({
    name: 'getComments',
    description: 'Get comments for a page revision in GROWI',
    parameters: getCommentsParamSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      title: 'Get Page Comments',
    },
    execute: async (params) => {
      try {
        // Validate parameters
        const validatedParams = getCommentsParamSchema.parse(params);

        // Prepare API parameters
        const apiParams = {
          page_id: validatedParams.pageId,
          ...(validatedParams.revisionId && { revision_id: validatedParams.revisionId }),
        };

        // Execute operation using SDK
        const result = await apiv1.getComments(apiParams);

        return JSON.stringify(result);
      } catch (error) {
        // Handle validation errors
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // Handle unexpected errors
        throw new UserError('Failed to get page comments', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
