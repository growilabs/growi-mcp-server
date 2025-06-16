import apiv3 from '@growi/sdk-typescript/v3';
import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { getShareLinksParamSchema } from './schema.js';

export function registerGetShareLinksTool(server: FastMCP): void {
  server.addTool({
    name: 'getShareLinks',
    description: 'Get share links for a specific page in GROWI',
    parameters: getShareLinksParamSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      title: 'Get Share Links',
    },
    execute: async (params) => {
      try {
        // Validate parameters
        const validatedParams = getShareLinksParamSchema.parse(params);

        // Execute operation using SDK
        const result = await apiv3.getShareLinks(validatedParams);

        return JSON.stringify(result);
      } catch (error) {
        // Handle validation errors
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // Handle unexpected errors
        throw new UserError('Failed to get share links', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
