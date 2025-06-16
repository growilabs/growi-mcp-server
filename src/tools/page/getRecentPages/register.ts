import apiv3 from '@growi/sdk-typescript/v3';
import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { getRecentPagesParamSchema } from './schema.js';

export function registerGetRecentPagesTool(server: FastMCP): void {
  server.addTool({
    name: 'getRecentPages',
    description: 'Get recently updated pages from GROWI with pagination support',
    parameters: getRecentPagesParamSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      title: 'Get Recent Pages',
    },
    execute: async (params) => {
      try {
        // Validate parameters
        const validatedParams = getRecentPagesParamSchema.parse(params);

        // Execute operation using SDK
        const result = await apiv3.getRecentForPages(validatedParams);

        return JSON.stringify(result);
      } catch (error) {
        // Handle validation errors
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // Handle unexpected errors
        throw new UserError('Failed to get recent pages', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
