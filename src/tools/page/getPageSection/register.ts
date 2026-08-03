import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { isGrowiApiError } from '../../../commons/api/growi-api-error.js';
import { HeadingMatchError } from '../../../commons/utils/markdown/parse-outline.js';
import { requirePageIdOrPath } from '../../../commons/utils/require-page-id-or-path.js';
import { resolveAppName } from '../../../commons/utils/resolve-app-name.js';
import { getPageSectionParamSchema } from './schema.js';
import { getPageSection } from './service.js';

export function registerGetPageSectionTool(server: FastMCP): void {
  server.addTool({
    name: 'getPageSection',
    description:
      'Read only a part of a GROWI page: either a section addressed by its heading text, or a line range (both as returned by getPageOutline). ' +
      'Token-efficient alternative to getPage for large pages. The body is returned without line numbers; use editPage (string match) to modify it.',
    parameters: getPageSectionParamSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      title: 'Get Page Section',
    },
    execute: async (params) => {
      try {
        // Validate parameters
        const { appName, ...getPageSectionParams } = getPageSectionParamSchema.parse(params);
        requirePageIdOrPath(getPageSectionParams);
        if (getPageSectionParams.heading != null && (getPageSectionParams.startLine != null || getPageSectionParams.endLine != null)) {
          throw new UserError('heading and startLine/endLine are mutually exclusive; provide only one addressing mode');
        }
        if (getPageSectionParams.heading == null && getPageSectionParams.startLine == null) {
          throw new UserError('Provide either heading or startLine (use getPageOutline to discover them)');
        }
        const resolvedAppName = resolveAppName(appName);

        const result = await getPageSection(getPageSectionParams, resolvedAppName);
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

        // Handle heading resolution errors (not found / ambiguous)
        if (error instanceof HeadingMatchError) {
          throw new UserError(error.message, {
            kind: error.kind,
            candidates: error.candidates,
          });
        }

        // Handle API errors
        if (isGrowiApiError(error)) {
          throw new UserError(`Failed to get page section: ${error.message}`, {
            statusCode: error.statusCode,
            details: error.details,
          });
        }

        // Handle unexpected errors
        throw new UserError('The page section operation could not be completed. Please try again later.', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });
}
