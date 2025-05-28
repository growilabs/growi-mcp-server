import type { FastMCP } from 'fastmcp';
import { container } from 'tsyringe';
import { z } from 'zod';
import { isGrowiApiError } from '../services/growi-api-error.js';
import type { IUserService } from '../services/user-service.js';
import { tokenUserService } from '../services/user-service.js';

export const meSchema = z.object({
  user: z.object({
    _id: z.string(),
    name: z.string(),
    username: z.string(),
    email: z.string(),
    admin: z.boolean(),
    imageUrlCached: z.string(),
    isGravatarEnabled: z.boolean(),
    isEmailPublished: z.boolean(),
    lang: z.string(),
    status: z.number(),
    createdAt: z.string().or(z.date()),
    lastLoginAt: z.string().or(z.date()).optional(),
    introduction: z.string(),
    isQuestionnaireEnabled: z.boolean(),
  }),
});

export const getExternalAccountsSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});
export const getUserPagesSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  limit: z.number().min(1).optional(),
  offset: z.number().min(0).optional(),
  sort: z.string().optional(),
  status: z.string().optional(),
});

export const logoutSchema = z.object({});

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().optional().describe('User display name'),
    email: z.string().email('Invalid email format').optional(),
  })
  .strict()
  .describe('Registration parameters matching subset of IUser interface');

export function registerLoginTool(server: FastMCP): void {
  const userService = container.resolve<IUserService>(tokenUserService);

  server.addTool({
    name: 'login',
    description: 'Login to GROWI with username and password',
    parameters: loginSchema,
    execute: async (args) => {
      const params = loginSchema.parse(args);
      try {
        const response = await userService.login(params);
        return JSON.stringify(response);
      } catch (error) {
        if (isGrowiApiError(error)) {
          // Don't include the password in error messages
          throw new Error(`Login failed: [${error.statusCode}] Authentication failed`);
        }
        // Generic error without exposing details
        throw new Error('Login failed. Please check your credentials and try again.');
      }
    },
  });
}

export function registerRegisterTool(server: FastMCP): void {
  const userService = container.resolve<IUserService>(tokenUserService);

  server.addTool({
    name: 'register',
    description: 'Register a new user account in GROWI',
    parameters: registerSchema,
    execute: async (args) => {
      const params = registerSchema.parse(args);
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

export function registerLogoutTool(server: FastMCP): void {
  const userService = container.resolve<IUserService>(tokenUserService);

  server.addTool({
    name: 'logout',
    description: 'Logout current user from GROWI',
    parameters: logoutSchema,
    execute: async () => {
      try {
        await userService.logout();
        return JSON.stringify({ status: 'success' });
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new Error(`Logout failed: [${error.statusCode}] ${error.message}`);
        }
        throw new Error('Logout failed. Please try again later.');
      }
    },
  });
}

export function registerMeTool(server: FastMCP): void {
  const userService = container.resolve<IUserService>(tokenUserService);

  server.addTool({
    name: 'me',
    description: 'Get current user information from GROWI',
    parameters: meSchema,
    execute: async () => {
      try {
        const response = await userService.me();
        return JSON.stringify(response);
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new Error(`Failed to get user info: [${error.statusCode}] ${error.message}`);
        }
        throw new Error('Failed to get user info. Please check if you are authenticated.');
      }
    },
  });
}

export function registerGetExternalAccountsTool(server: FastMCP): void {
  const userService = container.resolve<IUserService>(tokenUserService);

  server.addTool({
    name: 'getExternalAccounts',
    description: 'Get external accounts for a specific user',
    parameters: getExternalAccountsSchema,
    execute: async (args) => {
      const params = getExternalAccountsSchema.parse(args);
      try {
        const response = await userService.getExternalAccounts(params.userId);
        return JSON.stringify(response);
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new Error(`Failed to get external accounts: [${error.statusCode}] ${error.message}`);
        }
        throw new Error('Failed to get external accounts. Please try again later.');
      }
    },
  });
}

export function registerGetUserPagesTool(server: FastMCP): void {
  const userService = container.resolve<IUserService>(tokenUserService);

  server.addTool({
    name: 'getUserPages',
    description: 'Get pages created by a specific user',
    parameters: getUserPagesSchema,
    execute: async (args) => {
      const params = getUserPagesSchema.parse(args);
      try {
        const response = await userService.getPages(params);
        return JSON.stringify(response);
      } catch (error) {
        if (isGrowiApiError(error)) {
          if (error.statusCode === 404) {
            throw new Error('User not found');
          }
          if (error.statusCode === 403) {
            throw new Error('Access denied: You do not have permission to view these pages');
          }
          throw new Error(`Failed to get user pages: [${error.statusCode}] ${error.message}`);
        }
        throw new Error('Failed to get user pages. Please try again later.');
      }
    },
  });
}
