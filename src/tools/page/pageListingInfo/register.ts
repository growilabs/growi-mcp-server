import apiv3 from '@growi/sdk-typescript/v3';
import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { pageListingInfoParamSchema } from './schema.js';

export function registerPageListingInfoTool(server: FastMCP): void {
  server.addTool({
    name: 'pageListingInfo',
    description: 'Get summary information for pages in GROWI by IDs or path',
    parameters: pageListingInfoParamSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      title: 'Get summary information for pages',
    },
    execute: async (params) => {
      try {
        // Validate parameters
        const validatedParams = pageListingInfoParamSchema.parse(params);

        // Execute operation using SDK
        const result = await apiv3.getInfoForPageListing(validatedParams);
        return JSON.stringify(result);
      } catch (error) {
        // Handle validation errors
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // Handle unexpected errors
        throw new UserError('Failed to get page listing info', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
