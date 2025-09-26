import { type FastMCP, UserError } from 'fastmcp';
import { ZodError } from 'zod';
import { GrowiApiError, isGrowiApiError } from '../../../commons/api/growi-api-error.js';
import { setGrowiClient } from '../../commons/client-utils';
import { createPageParamSchema } from './schema.js';
import { createPage } from './service.js';

export function registerCreatePageTool(server: FastMCP): void {
  server.addTool({
    name: 'createPage',
    description: 'Create a new page in GROWI',
    parameters: createPageParamSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      title: 'Create Page',
    },
    execute: async (params, context) => {
      try {
        // Validate input using zod schema
        const validatedParams = createPageParamSchema.parse(params);

        const { appName, ...serviceParams } = validatedParams;

        await setGrowiClient(appName);

        const response = await createPage(serviceParams);

        try {
          return JSON.stringify(response);
        } catch (jsonError) {
          throw new GrowiApiError('Failed to serialize API response', 500, { error: jsonError instanceof Error ? jsonError.message : String(jsonError) });
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
        throw new UserError('The page creation operation could not be completed. Please try again later.', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
