import type { FastMCP } from 'fastmcp';
import { registerUserSchema } from './schema.js';
import { registerUser } from './service.js';

export function registerRegisterUserTool(server: FastMCP): void {
  server.addTool({
    name: 'register',
    description: 'Register a new user account in GROWI',
    parameters: registerUserSchema,
    execute: async (params) => {
      const response = await registerUser(params);
      return JSON.stringify(response);
    },
  });
}
