import type { FastMCP } from 'fastmcp';
import { UserError } from 'fastmcp';
import { z } from 'zod';
import { resolveAppName } from '../../../commons/utils/resolve-app-name.js';
import { getPageWholeContentsParamSchema } from './schema.js';
import { getPageWholeContents } from './service.js';

// Not error/warning: `_notice` signals up front that the message is informational, not a failure,
// so an LLM relaying it to the user does not report it as something having gone wrong.
const GET_PAGE_DEPRECATION_NOTICE =
  'getPage is deprecated and will be removed in 2.0.0. Use getPageOutline (structure), getPageSection (partial read), or getPageWholeContents (full body).';

/**
 * Shared execution path for getPageWholeContents and its deprecated alias getPage: both tools
 * must return the same body, so validation, fetch and error handling live here once instead of
 * being duplicated across two `addTool` registrations.
 *
 * Unlike getPageOutline/getPageSection/editPage, this path never throws GrowiApiError: the SDK
 * call surfaces raw axios errors, and response formatting does not throw. There is therefore no
 * GrowiApiError branch here (Requirement 5.2).
 */
async function executeGetPageWholeContents(params: unknown): Promise<Record<string, unknown>> {
  try {
    const { appName, ...getPageParams } = getPageWholeContentsParamSchema.parse(params);
    const resolvedAppName = resolveAppName(appName);

    return await getPageWholeContents(getPageParams, resolvedAppName);
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw new UserError('Invalid parameters provided', {
        validationErrors: error.errors,
      });
    }

    // Handle unexpected errors
    throw new UserError('Failed to get page', {
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}

export function registerGetPageWholeContentsTool(server: FastMCP): void {
  server.addTool({
    name: 'getPageWholeContents',
    description:
      'Get page data including the full markdown body of the specific GROWI page. ' +
      'For large pages, prefer getPageOutline + getPageSection to read only what you need; use editPage for partial modifications.',
    parameters: getPageWholeContentsParamSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      title: 'Get Page Whole Contents',
    },
    execute: async (params) => JSON.stringify(await executeGetPageWholeContents(params)),
  });
}

/**
 * Deprecated alias of getPageWholeContents (Requirement 2.2). Kept because getPage shipped in
 * 1.7.0: swapping its meaning instead of aliasing it would make it fail silently with different
 * content rather than erroring, which is the hardest kind of break to notice.
 */
export function registerGetPageTool(server: FastMCP): void {
  server.addTool({
    name: 'getPage',
    description:
      'DEPRECATED: will be removed in 2.0.0. Use getPageOutline (heading structure), getPageSection (partial read), ' +
      'or getPageWholeContents (full body) instead. For backward compatibility this currently behaves identically to ' +
      "getPageWholeContents, returning the page's full markdown body.",
    parameters: getPageWholeContentsParamSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
      title: 'Get Page (Deprecated)',
    },
    execute: async (params) => {
      const result = await executeGetPageWholeContents(params);
      return JSON.stringify({
        ...result,
        _notice: GET_PAGE_DEPRECATION_NOTICE,
      });
    },
  });
}
