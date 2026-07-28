import apiv1 from '@growi/sdk-typescript/v1';
import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { resolveAppName } from '../../../commons/utils/resolve-app-name.js';
import { removeCommentParamSchema } from './schema.js';

export function registerRemoveCommentTool(server: FastMCP): void {
  server.addTool({
    name: 'removeComment',
    description: 'Remove a comment from a page in GROWI',
    parameters: removeCommentParamSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      // Removing an already-deleted comment errors instead of being a no-op, so it is not idempotent.
      idempotentHint: false,
      openWorldHint: true,
      title: 'Remove Comment',
    },
    execute: async (params) => {
      try {
        const { appName, ...removeCommentParams } = removeCommentParamSchema.parse(params);
        const resolvedAppName = resolveAppName(appName);

        const result = await apiv1.removeComment({ comment_id: removeCommentParams.commentId }, { appName: resolvedAppName });

        return JSON.stringify(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        throw new UserError('Failed to remove comment', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
