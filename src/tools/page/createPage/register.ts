import { type FastMCP, UserError } from 'fastmcp';
import { ZodError } from 'zod';
import { isGrowiApiError } from '../../../commons/api/growi-api-error.js';
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

        const page = await createPage(validatedParams);
        return JSON.stringify(page);
      } catch (error) {
        // Handle zod validation errors
        if (error instanceof ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // Handle GROWI API errors
        if (isGrowiApiError(error)) {
          throw new UserError(`Failed to create page: ${error.message}`, {
            statusCode: error.statusCode,
            details: error.details,
            path: params.path,
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
