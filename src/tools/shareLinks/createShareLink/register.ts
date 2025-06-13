import apiv3 from '@growi/sdk-typescript/v3';
import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { createShareLinkParamSchema } from './schema.js';

export function registerCreateShareLinkTool(server: FastMCP): void {
  server.addTool({
    name: 'createShareLink',
    description: 'Create a share link for a page in GROWI',
    parameters: createShareLinkParamSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
      title: 'Create Share Link',
    },
    execute: async (params) => {
      try {
        // Validate parameters
        const validatedParams = createShareLinkParamSchema.parse(params);

        // Execute operation using SDK
        const result = await apiv3.postShareLinks(validatedParams);

        return JSON.stringify(result);
      } catch (error) {
        // Handle validation errors
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // Handle unexpected errors
        throw new UserError('Failed to create share link', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
