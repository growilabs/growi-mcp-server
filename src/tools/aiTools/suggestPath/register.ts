import { type FastMCP, UserError } from 'fastmcp';
import { ZodError } from 'zod';
import { GrowiApiError, isGrowiApiError } from '../../../commons/api/growi-api-error.js';
import { resolveAppName } from '../../../commons/utils/resolve-app-name.js';
import { suggestPathParamSchema } from './schema.js';
import { suggestPath } from './service.js';

export function registerSuggestPathTool(server: FastMCP): void {
  server.addTool({
    name: 'suggestPath',
    description: 'Get suggested save paths for content in GROWI. Analyzes the content body and returns directory path candidates with grant (permission) constraints.',
    parameters: suggestPathParamSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      title: 'Suggest Save Path',
    },
    execute: async (params) => {
      try {
        const validatedParams = suggestPathParamSchema.parse(params);
        const { appName, ...suggestPathParams } = validatedParams;

        const resolvedAppName = resolveAppName(appName);
        const response = await suggestPath(suggestPathParams, resolvedAppName);

        try {
          return JSON.stringify(response);
        } catch (jsonError) {
          throw new GrowiApiError('Failed to serialize API response', 500, { error: jsonError instanceof Error ? jsonError.message : String(jsonError) });
        }
      } catch (error) {
        if (error instanceof ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        if (isGrowiApiError(error)) {
          throw new UserError(error.message, {
            statusCode: error.statusCode,
            details: error.details,
          });
        }

        throw new UserError('The suggest path operation could not be completed. Please try again later.', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
