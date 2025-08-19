import apiv3 from '@growi/sdk-typescript/v3';
import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { getPageParamSchema } from './schema.js';

export function registerGetPageTool(server: FastMCP): void {
  server.addTool({
    name: 'getPage',
    description: 'Get page data about the specific GROWI page',
    parameters: getPageParamSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      title: 'Get Page',
    },
    execute: async (params) => {
      try {
        // Validate parameters
        const validatedParams = getPageParamSchema.parse(params);

        // Execute operation using SDK
        const page = await apiv3.getPage(validatedParams);
        return JSON.stringify(page);
      } catch (error) {
        // Handle validation errors
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // Handle unexpected errors
        throw new UserError('Failed to get page', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
