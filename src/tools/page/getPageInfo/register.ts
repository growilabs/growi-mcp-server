import type { PageParams } from '@growi/sdk-typescript/v3';
import apiv3 from '@growi/sdk-typescript/v3';
import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { getPageInfoParamSchema } from './schema.js';

export function registerGetPageInfoTool(server: FastMCP): void {
  server.addTool({
    name: 'getPageInfo',
    description: 'Get information about a specific GROWI page including like status and view counts',
    parameters: getPageInfoParamSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      title: 'Get Page Information',
    },
    execute: async (params) => {
      try {
        // Validate parameters
        const validatedParams = getPageInfoParamSchema.parse(params);

        // Prepare API parameters
        const apiParams: PageParams = {
          pageId: validatedParams.pageId,
        };

        // Execute operation using SDK
        const result = await apiv3.getInfoForPage(apiParams);

        return JSON.stringify(result);
      } catch (error) {
        // Handle validation errors
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // Handle unexpected errors
        throw new UserError('Failed to get page information', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
