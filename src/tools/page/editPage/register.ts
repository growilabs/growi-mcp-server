import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { isGrowiApiError } from '../../../commons/api/growi-api-error.js';
import { EditMatchError } from '../../../commons/utils/markdown/apply-string-edits.js';
import { resolveAppName } from '../../../commons/utils/resolve-app-name.js';
import { editPageParamSchema } from './schema.js';
import { editPage } from './service.js';

export function registerEditPageTool(server: FastMCP): void {
  server.addTool({
    name: 'editPage',
    description:
      'Edit parts of a GROWI page with string replacements, WITHOUT sending the whole body. ' +
      'Each edit replaces an exact literal oldString with newString (oldString must match exactly once unless replaceAll is true). ' +
      "Uses optimistic concurrency on the page's current revision: a conflicting concurrent update is retried automatically once, " +
      'except when replaceAll or expectedRevisionId is used (those fail with a conflict error instead). ' +
      'Use getPageOutline/getPageSection to read the current text first, and dryRun to preview a unified diff.',
    parameters: editPageParamSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
      title: 'Edit Page (partial)',
    },
    execute: async (params) => {
      try {
        // Validate parameters
        const { appName, ...editPageParams } = editPageParamSchema.parse(params);
        // Cross-field checks live here: fastmcp requires a plain z.object for `parameters`,
        // so a top-level .refine() (which wraps the schema in ZodEffects) is not an option
        if (editPageParams.pageId == null && editPageParams.path == null) {
          throw new UserError('Either pageId or path must be provided');
        }
        const resolvedAppName = resolveAppName(appName);

        const result = await editPage(editPageParams, resolvedAppName);
        return JSON.stringify(result);
      } catch (error) {
        // Handle validation errors
        if (error instanceof z.ZodError) {
          throw new UserError('Invalid parameters provided', {
            validationErrors: error.errors,
          });
        }

        if (error instanceof UserError) {
          throw error;
        }

        // Handle edit matching errors (nothing has been written)
        if (error instanceof EditMatchError) {
          throw new UserError(error.message, {
            editIndex: error.editIndex,
            kind: error.kind,
            matchCount: error.matchCount,
            occurrences: error.occurrences,
            hint: 'Re-read the relevant part with getPageSection and adjust oldString to the current content.',
          });
        }

        // Handle API errors
        if (isGrowiApiError(error)) {
          throw new UserError(`Failed to edit page: ${error.message}`, {
            statusCode: error.statusCode,
            details: error.details,
          });
        }

        // Handle unexpected errors
        throw new UserError('The page edit operation could not be completed. Please try again later.', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
