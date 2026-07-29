import apiv3 from '@growi/sdk-typescript/v3';
import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { isGrowiApiError } from '../../../commons/api/growi-api-error.js';
import { trimPageForResponse } from '../../../commons/utils/growi-page.js';
import { resolveAppName } from '../../../commons/utils/resolve-app-name.js';
import { getPageParamSchema } from './schema.js';

export function registerGetPageTool(server: FastMCP): void {
  server.addTool({
    name: 'getPage',
    description:
      'Get page data including the full markdown body of the specific GROWI page. ' +
      'For large pages, prefer getPageOutline + getPageSection to read only what you need; use editPage for partial modifications.',
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
        const { appName, ...getPageParams } = getPageParamSchema.parse(params);
        const resolvedAppName = resolveAppName(appName);

        // Execute operation using SDK
        const result = await apiv3.getPage(getPageParams, { appName: resolvedAppName });
        return JSON.stringify({
          ...result,
          page: result?.page != null ? trimPageForResponse(result.page, { keepBody: true }) : result?.page,
        });
      } catch (error) {
        // Handle validation errors
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // Handle API errors
        if (isGrowiApiError(error)) {
          throw new UserError('Failed to get page', {
            statusCode: error.statusCode,
            details: error.details,
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
