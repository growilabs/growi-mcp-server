import apiv3 from '@growi/sdk-typescript/v3';
import { type FastMCP, UserError } from 'fastmcp';
import { resolveAppName } from '../../../commons/utils/resolve-app-name';
import { publishPageParamSchema } from './schema';

export function registerPublishPageTool(server: FastMCP): void {
  server.addTool({
    name: 'publishPage',
    description: 'Publish a page by its ID',
    parameters: publishPageParamSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      title: 'Publish Page',
    },
    execute: async (params) => {
      try {
        const { appName, ...publishPageParams } = publishPageParamSchema.parse(params);
        const resolvedAppName = resolveAppName(appName);

        const page = await apiv3.putPublishByPageIdForPage(publishPageParams.pageId, { appName: resolvedAppName });

        return JSON.stringify({
          status: 'success',
          message: 'Page published successfully',
          data: page,
        });
      } catch (error) {
        if (error instanceof Error) {
          throw new UserError(`Failed to publish page: ${error.message}`);
        }
        throw new UserError('Failed to publish page');
      }
    },
  });
}
