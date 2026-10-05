import apiv3 from '@growi/sdk-typescript/v3';
import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { resolveAppName } from '../../../commons/utils/resolve-app-name.js';
import { getCommentsParamSchema } from './schema.js';

export function registerGetCommentsTool(server: FastMCP): void {
  server.addTool({
    name: 'getComments',
    description:
      'Get the comments of a page in GROWI. Returns both regular comments and inline comments (comments anchored to a quoted passage of the page body), including replies, newest first. Use the `isInline` field of each item to tell them apart; replies are separate items linked by `replyToId`.',
    parameters: getCommentsParamSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      title: 'Get Page Comments',
    },
    execute: async (params) => {
      try {
        // Validate parameters
        const { appName, ...getCommentsParams } = getCommentsParamSchema.parse(params);
        const resolvedAppName = resolveAppName(appName);

        // Prepare API parameters
        const apiParams = {
          pageId: getCommentsParams.pageId,
          ...(getCommentsParams.revisionId && { revisionId: getCommentsParams.revisionId }),
        };

        // Execute operation using SDK
        const result = await apiv3.getComments(apiParams, { appName: resolvedAppName });

        return JSON.stringify(result);
      } catch (error) {
        // Handle validation errors
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        // Handle unexpected errors
        throw new UserError('Failed to get page comments', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
