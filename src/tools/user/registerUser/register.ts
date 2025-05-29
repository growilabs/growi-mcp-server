import type { FastMCP } from 'fastmcp';
import { container } from 'tsyringe';
import { isGrowiApiError } from '../../../commons/api/growi-api-error.js';
import type { IUserService } from '../../../services/user-service.js';
import { tokenUserService } from '../../../services/user-service.js';
import { registerUserSchema } from './schema.js';

export function registerRegisterUserTool(server: FastMCP): void {
  const userService = container.resolve<IUserService>(tokenUserService);

  server.addTool({
    name: 'register',
    description: 'Register a new user account in GROWI',
    parameters: registerUserSchema,
    execute: async (params) => {
      try {
        const response = await userService.register(params);
        return JSON.stringify(response);
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new Error(`Registration failed: [${error.statusCode}] ${error.message}`);
        }
        throw new Error('Registration failed. Please try again later.');
      }
    },
  });
}
