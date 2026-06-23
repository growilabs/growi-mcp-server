import apiv1 from '@growi/sdk-typescript/v1';
import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { resolveAppName } from '../../../commons/utils/resolve-app-name.js';
import { addCommentParamSchema } from './schema.js';

export function registerAddCommentTool(server: FastMCP): void {
  server.addTool({
    name: 'addComment',
    description: 'Add a comment to a page in GROWI',
    parameters: addCommentParamSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
      title: 'Add Comment',
    },
    execute: async (params) => {
      try {
        const { appName, ...addCommentParams } = addCommentParamSchema.parse(params);
        const resolvedAppName = resolveAppName(appName);

        const result = await apiv1.addComment(
          {
            commentForm: {
              page_id: addCommentParams.pageId,
              ...(addCommentParams.revisionId && { revision_id: addCommentParams.revisionId }),
              comment: addCommentParams.comment,
            },
          },
          { appName: resolvedAppName },
        );

        return JSON.stringify(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        throw new UserError('Failed to add comment', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
