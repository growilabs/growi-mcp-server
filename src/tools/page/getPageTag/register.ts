import apiv1 from '@growi/sdk-typescript/v1';
import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { resolveAppName } from '../../../commons/utils/resolve-app-name.js';
import { getPageTagParamSchema } from './schema.js';

export function registerGetPageTagTool(server: FastMCP): void {
  server.addTool({
    name: 'getPageTag',
    description: 'Get tags for a specific page in GROWI',
    parameters: getPageTagParamSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      title: 'Get Page Tags',
    },
    execute: async (params) => {
      try {
        // Validate parameters
        const { appName, ...getPageTagParams } = getPageTagParamSchema.parse(params);
        const resolvedAppName = resolveAppName(appName);

        // Execute operation using SDK
        const result = await apiv1.getPageTag(getPageTagParams, { appName: resolvedAppName });

        return JSON.stringify(result);
      } catch (error) {
        // Handle validation errors
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // Handle unexpected errors
        throw new UserError('Failed to get page tags', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
