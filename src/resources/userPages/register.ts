import type { FastMCP } from 'fastmcp';
import { type ListUserPagesParams, listUserPages } from './service.js';

export function registerUserPagesResource(server: FastMCP): void {
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
    async load(params) {
      const userPagesParams: ListUserPagesParams = {
        userId: params.userId,
        limit: params.limit != null ? Number(params.limit) : undefined,
        offset: params.offset != null ? Number(params.offset) : undefined,
        sort: params.sort,
        status: params.status,
      };
      const response = await listUserPages(userPagesParams);
      return { text: JSON.stringify(response) };
    },
  });
}
