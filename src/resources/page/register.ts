import type { FastMCP } from 'fastmcp';

import apiv3 from '@growi/sdk-typescript/v3';

export function registerPageResource(server: FastMCP): void {
  // Root page resource
  server.addResource({
    uri: 'growi://page/root',
    name: 'GROWI Root Page Content',
    mimeType: 'application/json',
    async load() {
      try {
        const page = await apiv3.getPage({ path: '/' });
        return { text: JSON.stringify(page) };
      } catch (error) {
        console.error(`Error loading GROWI page resource for path "/":`, error);
        throw new Error('Failed to load GROWI root page');
      }
    },
  });

  // Page resource with pagePath parameter
  server.addResourceTemplate({
    uriTemplate: 'growi://page/{path}',
    name: 'GROWI Page Content',
    mimeType: 'application/json',
    arguments: [
      {
        name: 'path',
        description: 'Page path of the GROWI page',
        required: true,
      },
    ],
    async load({ path }) {
      try {
        const page = await apiv3.getPage({ path });
        return { text: JSON.stringify(page) };
      } catch (error) {
        console.error(`Error loading GROWI page resource for path "${path}":`, error);
        throw new Error(`Failed to load GROWI page: ${path}`);
      }
    },
  });
  // Pages List resource
  server.addResourceTemplate({
    uriTemplate: 'growi://pages/list{?path,limit,page}',
    name: 'GROWI Pages List',
    mimeType: 'application/json',
    arguments: [
      {
        name: 'path',
        description: '検索対象のページパス',
        required: false,
      },
      {
        name: 'limit',
        description: '1ページあたりの取得件数',
        required: false,
      },
      {
        name: 'page',
        description: 'ページ番号',
        required: false,
      },
    ],
    async load({ path, limit, page }) {
      try {
        const result = await apiv3.getListForPages({
          path,
          limit: limit ? Number.parseInt(limit, 10) : undefined,
          page: page ? Number.parseInt(page, 10) : undefined,
        });
        return { text: JSON.stringify(result) };
      } catch (error) {
        console.error('Error loading GROWI pages list:', error);
        throw new Error('Failed to load GROWI pages list');
      }
    },
  });
}
