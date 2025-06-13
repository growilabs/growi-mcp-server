import apiv3 from '@growi/sdk-typescript/v3';
import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { deleteShareLinksParamSchema } from './schema.js';

export function registerDeleteShareLinksTool(server: FastMCP): void {
  server.addTool({
    name: 'deleteShareLinks',
    description: 'Delete all share links for a page in GROWI',
    parameters: deleteShareLinksParamSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
      title: 'Delete Share Links',
    },
    execute: async (params) => {
      try {
        // Validate parameters
        const validatedParams = deleteShareLinksParamSchema.parse(params);

        // Execute operation using SDK
        const result = await apiv3.deleteShareLinks(validatedParams);

        return JSON.stringify(result);
      } catch (error) {
        // Handle validation errors
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // Handle unexpected errors
        throw new UserError('Failed to delete share links', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
