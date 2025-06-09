import type { FastMCP } from 'fastmcp';
import { getMe } from './service.js';

export function registerMeResource(server: FastMCP): void {
  server.addResourceTemplate({
    uriTemplate: 'growi://me',
    name: 'GROWI Current User',
    mimeType: 'application/json',
    arguments: [],
    async load() {
      try {
        const response = await getMe();
        return { text: JSON.stringify(response) };
      } catch (error) {
        console.error('Error loading GROWI current user info:', error);
        throw new Error('Failed to load GROWI current user info');
      }
    },
  });
}
