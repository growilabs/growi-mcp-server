import apiv1 from '@growi/sdk-typescript/v1';
import { type FastMCP, UserError } from 'fastmcp';
import { ZodError } from 'zod';
import { GrowiApiError, isGrowiApiError } from '../../../commons/api/growi-api-error.js';
import { resolveAppName } from '../../../commons/utils/resolve-app-name.js';
import { searchPagesParamSchema } from './schema.js';

export function registerSearchPagesTool(server: FastMCP): void {
  server.addTool({
    name: 'searchPages',
    description: 'Search pages in GROWI using Elasticsearch',
    parameters: searchPagesParamSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      title: 'Search Pages',
    },
    execute: async (params, context) => {
      try {
        // Validate input using zod schema
        const { appName, ...searchPagesParams } = searchPagesParamSchema.parse(params);
        const resolvedAppName = resolveAppName(appName);

        // Execute search using SDK
        const response = await apiv1.searchPages(searchPagesParams, { appName: resolvedAppName });

        if (!response.data) {
          throw new GrowiApiError('Invalid response received from search API', 500, { response });
        }

        try {
          return JSON.stringify(response.data);
        } catch (jsonError) {
          throw new GrowiApiError('Failed to serialize API response', 500, {
            error: jsonError instanceof Error ? jsonError.message : String(jsonError),
          });
        }
      } catch (error) {
        // Handle zod validation errors
        if (error instanceof ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // Convert GrowiApiError to UserError
        if (isGrowiApiError(error)) {
          throw new UserError(error.message, {
            statusCode: error.statusCode,
            details: error.details,
          });
        }

        // Handle unexpected errors
        throw new UserError('The page search operation could not be completed. Please try again later.', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
