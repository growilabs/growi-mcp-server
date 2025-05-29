import type { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { apiV3 } from '../../commons/api/client-v3.js';
import { isGrowiApiError } from '../../commons/api/growi-api-error.js';

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

export function registerMeResource(server: FastMCP): void {
  server.addResource({
    name: 'me',
    description: 'Get current user information from GROWI',
    schema: meSchema,
    execute: async () => {
      try {
        const response = await apiV3.get('users/me').json();
        return response;
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new Error(`Failed to get user info: [${error.statusCode}] ${error.message}`);
        }
        throw new Error('Failed to get user info. Please check if you are authenticated.');
      }
    },
  });
}

export function registerGetExternalAccountsResource(server: FastMCP): void {
  server.addResource({
    name: 'getExternalAccounts',
    description: 'Get external accounts for a specific user',
    schema: getExternalAccountsSchema,
    execute: async (args) => {
      const params = getExternalAccountsSchema.parse(args);
      try {
        const response = await apiV3.get(`users/${params.userId}/external-accounts`).json();
        return response;
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new Error(`Failed to get external accounts: [${error.statusCode}] ${error.message}`);
        }
        throw new Error('Failed to get external accounts. Please try again later.');
      }
    },
  });
}

export function registerGetUserPagesResource(server: FastMCP): void {
  server.addResource({
    name: 'getUserPages',
    description: 'Get pages created by a specific user',
    schema: getUserPagesSchema,
    execute: async (args) => {
      const params = getUserPagesSchema.parse(args);
      try {
        const searchParams = new URLSearchParams();
        if (params.limit) searchParams.set('limit', params.limit.toString());
        if (params.offset) searchParams.set('offset', params.offset.toString());
        if (params.sort) searchParams.set('sort', params.sort);
        if (params.status) searchParams.set('status', params.status);

        const response = await apiV3
          .get(`users/${params.userId}/pages`, {
            searchParams,
          })
          .json();
        return response;
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

export function loadUserResources(server: FastMCP): void {
  registerMeResource(server);
  registerGetExternalAccountsResource(server);
  registerGetUserPagesResource(server);
}
