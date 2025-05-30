import { type FastMCP, UserError } from 'fastmcp';
import { z } from 'zod';
import { isGrowiApiError } from '../../../commons/api/growi-api-error.js';
import { registerUserSchema } from './schema.js';
import { registerUser } from './service.js';

export function registerRegisterUserTool(server: FastMCP): void {
  server.addTool({
    name: 'register',
    description: 'Register a new user account in GROWI',
    parameters: registerUserSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
      title: 'Register User',
    },
    execute: async (params, context) => {
      try {
        // Validate parameters
        const validatedParams = registerUserSchema.parse(params);

        // Execute service with validated parameters
        const response = await registerUser(validatedParams);
        return JSON.stringify(response);
      } catch (error) {
        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // Handle API errors
        if (isGrowiApiError(error)) {
          throw new UserError(`Failed to register user: ${error.message}`, {
            statusCode: error.statusCode,
            details: error.details,
          });
        }

        // Handle unexpected errors
        throw new UserError('Registration failed. Please try again later.');
      }
    },
  });
}
