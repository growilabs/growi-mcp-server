import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { isGrowiApiError } from '../../../commons/api/growi-api-error.js';
import { updatePageParamSchema } from './schema.js';
import { updatePage } from './service.js';

export function registerUpdatePageTool(server: FastMCP): void {
  server.addTool({
    name: 'updatePage',
    description: 'Update an existing page in GROWI',
    parameters: updatePageParamSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
    },
    execute: async (params) => {
      try {
        // Validate parameters
        const validatedParams = updatePageParamSchema.parse(params);

        // Execute update operation
        const page = await updatePage(validatedParams);
        return JSON.stringify(page);
      } catch (error) {
        // Handle validation errors
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // Handle API errors
        if (isGrowiApiError(error)) {
          throw new UserError('Failed to update page', {
            statusCode: error.statusCode,
            details: error.details,
          });
        }

        // Handle unexpected errors
        throw new UserError('An unexpected error occurred while updating the page. Please try again later.');
      }
    },
  });
}
