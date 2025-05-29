import type { FastMCP } from 'fastmcp';
import { getExternalAccounts, getMe, getUserPages } from './service.js';

export function registerMeResource(server: FastMCP): void {
  server.addResourceTemplate({
    uriTemplate: 'growi://user/me',
    name: 'GROWI Current User',
    mimeType: 'application/json',
    arguments: [], // 空の配列を指定
    async load() {
      const result = await getMe();
      return { text: JSON.stringify(result) };
    },
  });
}

export function registerGetExternalAccountsResource(server: FastMCP): void {
  server.addResourceTemplate({
    uriTemplate: 'growi://user/{userId}/external-accounts',
    name: 'GROWI User External Accounts',
    mimeType: 'application/json',
    arguments: [
      {
        name: 'userId',
        description: 'ID of the user',
        required: true,
      },
    ],
    async load({ userId }) {
      const result = await getExternalAccounts(userId);
      return { text: JSON.stringify(result) };
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
        description: 'ID of the user',
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
        description: 'Sort order',
        required: false,
      },
      {
        name: 'status',
        description: 'Page status filter',
        required: false,
      },
    ],
    async load({ userId, limit, offset, sort, status }) {
      const result = await getUserPages({
        userId,
        limit: limit ? Number.parseInt(limit, 10) : undefined,
        offset: offset ? Number.parseInt(offset, 10) : undefined,
        sort,
        status,
      });
      return { text: JSON.stringify(result) };
    },
  });
}

export function loadUserResources(server: FastMCP): void {
  registerMeResource(server);
  registerGetExternalAccountsResource(server);
  registerGetUserPagesResource(server);
}
