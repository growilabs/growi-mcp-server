import type { IPageInfoAll } from '@growi/core/dist/interfaces';
import { apiV3 } from '../../../commons/api/client-v3.js';
import { GrowiApiError, isGrowiApiError } from '../../../commons/api/growi-api-error.js';

export type GetPageInfoParams = {
  pageId: string;
};

export async function getPageInfo(params: GetPageInfoParams): Promise<IPageInfoAll> {
  try {
    const response = await apiV3
      .get('page/info', {
        json: {
          pageId: params.pageId,
        },
      })
      .json<{ pageInfo: IPageInfoAll }>();

    if (!response.pageInfo) {
      throw new GrowiApiError('Page info not found', 404);
    }

    return response.pageInfo;
  } catch (error) {
    if (isGrowiApiError(error)) {
      throw error;
    }

    if (error instanceof Error) {
      // Handle ky library errors
      if ('response' in error) {
        const response = (error as { response: Response }).response;
        throw new GrowiApiError('Failed to fetch page info from GROWI', response.status, await response.json().catch(() => undefined));
      }
    }

    throw new GrowiApiError('Unknown error occurred', 500, error);
  }
}
