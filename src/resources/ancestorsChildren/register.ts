import type { FastMCP } from 'fastmcp';
import { getAncestorsChildrenParamSchema } from './schema.js';
import { getAncestorsChildren } from './service.js';

export function registerGetAncestorsChildrenTool(server: FastMCP): void {
  server.addTool({
    name: 'getAncestorsChildren',
    description: 'Get ancestors and their children for a specific page in GROWI',
    parameters: getAncestorsChildrenParamSchema,
    execute: async (args) => {
      const params = getAncestorsChildrenParamSchema.parse(args);
      const response = await getAncestorsChildren(params);
      return JSON.stringify(response);
    },
  });
}
