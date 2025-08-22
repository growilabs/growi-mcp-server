import apiv3 from '@growi/sdk-typescript/v3';
import { type FastMCP, UserError } from 'fastmcp';
import { unpublishPageParamSchema } from './schema';

export function registerUnpublishPageTool(server: FastMCP): void {
  server.addTool({
    name: 'unpublishPage',
    description: 'Unpublish a page by its ID',
    parameters: unpublishPageParamSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      title: 'Unpublish Page',
    },
    execute: async (params) => {
      try {
        const validatedParams = unpublishPageParamSchema.parse(params);

        const page = await apiv3.putUnpublishByPageIdForPage(validatedParams.pageId);

        return JSON.stringify({
          status: 'success',
          message: 'Page unpublished successfully',
          data: page,
        });
      } catch (error) {
        if (error instanceof Error) {
          throw new UserError(`Failed to unpublish page: ${error.message}`);
        }
        throw new UserError('Failed to unpublish page');
      }
    },
  });
}
