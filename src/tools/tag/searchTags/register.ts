import apiv1 from '@growi/sdk-typescript/v1';
import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { searchTagsParamSchema } from './schema.js';

export function registerSearchTagsTool(server: FastMCP): void {
  server.addTool({
    name: 'searchTags',
    description: 'Search for tags in GROWI',
    parameters: searchTagsParamSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      title: 'Search Tags',
    },
    execute: async (params) => {
      try {
        // Validate parameters
        const validatedParams = searchTagsParamSchema.parse(params);

        // Prepare API parameters
        const apiParams = validatedParams.q ? { q: validatedParams.q } : undefined;

        // Execute operation using SDK
        const result = await apiv1.searchTags(apiParams);

        return JSON.stringify(result);
      } catch (error) {
        // Handle validation errors
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // Handle unexpected errors
        throw new UserError('Failed to search tags', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
