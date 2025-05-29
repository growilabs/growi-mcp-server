import { type FastMCP, UserError } from 'fastmcp';
import { isGrowiApiError } from '../../../commons/api/growi-api-error.js';
import { createPageParamSchema } from './schema.js';
import { createPage } from './service.js';

export function registerCreatePageTool(server: FastMCP): void {
  server.addTool({
    name: 'createPage',
    description: 'Create a new page in GROWI',
    parameters: createPageParamSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      title: 'Create Page',
    },
    execute: async (params, context) => {
      try {
        const page = await createPage(params);
        return JSON.stringify(page);
      } catch (error) {
        if (isGrowiApiError(error)) {
          throw new UserError(`ページの作成に失敗しました: ${error.message}`, {
            statusCode: error.statusCode,
            details: error.details,
          });
        }

        throw new UserError('ページの作成に失敗しました。しばらく時間をおいて再度お試しください。');
      }
    },
  });
}
