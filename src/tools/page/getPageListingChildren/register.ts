import apiv3 from '@growi/sdk-typescript/v3';
import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { resolveAppName } from '../../../commons/utils/resolve-app-name.js';
import { getPageListingChildrenParamSchema } from './schema.js';

export function registerGetPageListingChildrenTool(server: FastMCP): void {
  server.addTool({
    name: 'getPageListingChildren',
    description: 'Get children pages for a specified page by ID or path in GROWI',
    parameters: getPageListingChildrenParamSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      title: 'Get Page Listing Children',
    },
    execute: async (params) => {
      try {
        // Validate parameters
        const { appName, ...getChildrenParams } = getPageListingChildrenParamSchema.parse(params);
        const resolvedAppName = resolveAppName(appName);

        // Execute operation using SDK
        const result = await apiv3.getChildrenForPageListing(getChildrenParams, { appName: resolvedAppName });

        return JSON.stringify(result);
      } catch (error) {
        // Handle validation errors
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // Handle unexpected errors
        throw new UserError('Failed to get page listing children', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
