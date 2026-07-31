import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { isGrowiApiError } from '../../../commons/api/growi-api-error.js';
import { resolveAppName } from '../../../commons/utils/resolve-app-name.js';
import { getPageOutlineParamSchema } from './schema.js';
import { getPageOutline } from './service.js';

export function registerGetPageOutlineTool(server: FastMCP): void {
  server.addTool({
    name: 'getPageOutline',
    description:
      'Get the heading outline of a GROWI page (heading levels, texts, line ranges and section sizes) WITHOUT the page body. ' +
      'Token-efficient entry point for large pages: use it to locate a section, then read only that part with getPageSection and edit it with editPage.',
    parameters: getPageOutlineParamSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      title: 'Get Page Outline',
    },
    execute: async (params) => {
      try {
        // Validate parameters
        const { appName, ...getPageOutlineParams } = getPageOutlineParamSchema.parse(params);
        // Cross-field checks live here: fastmcp requires a plain z.object for `parameters`,
        // so a top-level .refine() (which wraps the schema in ZodEffects) is not an option
        if (getPageOutlineParams.pageId == null && getPageOutlineParams.path == null) {
          throw new UserError('Either pageId or path must be provided');
        }
        const resolvedAppName = resolveAppName(appName);

        const result = await getPageOutline(getPageOutlineParams, resolvedAppName);
        return JSON.stringify(result);
      } catch (error) {
        // Handle validation errors
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        if (error instanceof UserError) {
          throw error;
        }

        // Handle API errors
        if (isGrowiApiError(error)) {
          throw new UserError(`Failed to get page outline: ${error.message}`, {
            statusCode: error.statusCode,
            details: error.details,
          });
        }

        // Handle unexpected errors
        throw new UserError('The page outline operation could not be completed. Please try again later.', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
