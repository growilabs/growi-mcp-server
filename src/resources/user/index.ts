import type { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { apiV3 } from '../../commons/api/client-v3.js';
import { isGrowiApiError } from '../../commons/api/growi-api-error.js';

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

export function registerGetExternalAccountsResource(server: FastMCP): void {
  server.addResourceTemplate({
    uriTemplate: 'growi://user/{userId}/external-accounts',
    name: 'GROWI User External Accounts',
    mimeType: 'application/json',
    arguments: [
      {
        name: 'userId',
        description: 'ID of the user to get external accounts for',
        required: true,
      },
    ],
    async load({ userId }) {
      try {
        const response = await apiV3.get(`users/${userId}/external-accounts`).json();
        return { text: JSON.stringify(response) };
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
  server.addResourceTemplate({
    uriTemplate: 'growi://user/{userId}/pages',
    name: 'GROWI User Pages',
    mimeType: 'application/json',
    arguments: [
      {
        name: 'userId',
        description: 'ID of the user to get pages for',
        required: true,
      },
      {
        name: 'limit',
        description: 'Maximum number of pages to return',
        required: false,
      },
      {
        name: 'offset',
        description: 'Number of pages to skip',
        required: false,
      },
      {
        name: 'sort',
        description: 'Sort order of pages',
        required: false,
      },
      {
        name: 'status',
        description: 'Filter by page status',
        required: false,
      },
    ],
    async load({ userId, limit, offset, sort, status }) {
      try {
        const searchParams = new URLSearchParams();
        if (limit) searchParams.set('limit', limit.toString());
        if (offset) searchParams.set('offset', offset.toString());
        if (sort) searchParams.set('sort', sort);
        if (status) searchParams.set('status', status);

        const response = await apiV3
          .get(`users/${userId}/pages`, {
            searchParams,
          })
          .json();
        return { text: JSON.stringify(response) };
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
  registerGetExternalAccountsResource(server);
  registerGetUserPagesResource(server);
}
