import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { isGrowiApiError } from '../../../commons/api/growi-api-error.js';
import { deletePagesParamSchema } from './schema.js';
import { deletePages } from './service.js';

export function registerDeletePagesTool(server: FastMCP): void {
  server.addTool({
    name: 'deletePages',
    description: 'Delete pages in GROWI',
    parameters: deletePagesParamSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
    },
    execute: async (params) => {
      try {
        // Validate parameters
        const validatedParams = deletePagesParamSchema.parse(params);

        // Execute service operation with validated parameters
        const response = await deletePages(validatedParams);
        return JSON.stringify(response);
      } catch (error) {
        // Handle validation errors
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // Handle API errors
        if (isGrowiApiError(error)) {
          throw new UserError(`Operation failed: ${error.message}`, {
            statusCode: error.statusCode,
            details: error.details,
          });
        }

        // Handle unexpected errors
        throw new UserError('The operation could not be completed. Please try again later.', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
