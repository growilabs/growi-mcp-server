import { type FastMCP, UserError } from 'fastmcp';
import { ZodError } from 'zod';

import { GrowiApiError } from '../../../commons/api/growi-api-error';
import { duplicatePageSchema } from './schema';
import { duplicatePage } from './service';

export const registerDuplicatePageTool = (server: FastMCP): void => {
  server.addTool({
    name: 'duplicatePage',
    description: 'Duplicate a page. Can recursively duplicate the page with its descendants.',
    parameters: duplicatePageSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      title: 'Duplicate Page',
    },
    execute: async (params) => {
      try {
        // Validate params using zod schema
        const validatedParams = duplicatePageSchema.parse(params);

        // Execute duplication
        const duplicatedPage = await duplicatePage(validatedParams);

        return JSON.stringify({
          status: 'success',
          message: 'Page duplicated successfully',
          page: duplicatedPage,
        });
      } catch (error) {
        // Handle validation errors
        if (error instanceof ZodError) {
          throw new UserError('Invalid parameters', {
            validationErrors: error.errors,
          });
        }

        // Handle GROWI API errors
        if (error instanceof GrowiApiError) {
          throw new UserError(error.message, {
            statusCode: error.statusCode,
            details: error.details,
          });
        }

        // Handle unexpected errors
        throw new UserError('Failed to duplicate page', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
};
