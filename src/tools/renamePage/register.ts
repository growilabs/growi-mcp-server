import type { FastMCP } from 'fastmcp';
import { isGrowiApiError } from '../../commons/api/growi-api-error.js';
import { renamePageParamSchema } from './schema.js';
import { renamePage } from './service.js';

export function registerRenamePageTool(server: FastMCP): void {
  server.addTool({
    name: 'renamePage',
    description: 'Rename or move a page in GROWI',
    parameters: renamePageParamSchema,
    execute: async (args) => {
      const params = renamePageParamSchema.parse(args);
      try {
        const page = await renamePage(params);
        return JSON.stringify(page);
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new Error(`Failed to rename page: [${error.statusCode}] ${error.message}${error.details != null ? `\n${JSON.stringify(error.details)}` : ''}`);
        }
        throw error;
      }
    },
  });
}
