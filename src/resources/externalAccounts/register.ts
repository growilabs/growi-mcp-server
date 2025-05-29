import type { FastMCP } from 'fastmcp';
import { getExternalAccounts } from './service.js';

export function registerGetExternalAccountsResource(server: FastMCP): void {
  server.addResourceTemplate({
    uriTemplate: 'growi://external-accounts/user/{userId}',
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
