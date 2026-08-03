import apiv3 from '@growi/sdk-typescript/v3';
import { trimPageForResponse } from '../../../commons/utils/growi-page.js';
import type { GetPageWholeContentsParam } from './schema.js';

export type GetPageWholeContentsParams = Omit<GetPageWholeContentsParam, 'appName'>;

/**
 * Fetches a GROWI page and trims it for an LLM-facing response, keeping the full markdown body.
 * This is a 1:1 move of the former getPage/register.ts body (Requirement 2.1); getPage
 * (deprecated) and getPageWholeContents both call this so their responses stay identical.
 */
export const getPageWholeContents = async (params: GetPageWholeContentsParams, appName: string): Promise<Record<string, unknown>> => {
  const result = await apiv3.getPage(params, { appName });
  return {
    ...result,
    page: result?.page != null ? trimPageForResponse(result.page, { keepBody: true }) : result?.page,
  };
};
