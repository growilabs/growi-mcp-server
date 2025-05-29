import type { IPage } from '@growi/core/dist/interfaces';
import { apiV3 } from '../../../commons/api/client-v3.js';
import { GrowiApiError, isGrowiApiError } from '../../../commons/api/growi-api-error.js';
import type { UpdatePageParam } from './schema.js';

export const updatePage = async (params: UpdatePageParam): Promise<IPage> => {
  try {
    const response = await apiV3
      .put('page', {
        json: {
          page_id: params.pageId,
          body: params.body,
          grant: params.grant,
          grantUserGroupId: params.grantUserGroupId,
          pageTags: params.pageTags,
          revision: params.revision,
        },
      })
      .json<{ page: IPage }>();

    if (!response.page) {
      throw new GrowiApiError('Failed to retrieve page data after update', 500);
    }

    return response.page;
  } catch (error) {
    if (isGrowiApiError(error)) {
      throw error;
    }

    if (error instanceof Error) {
      // Handle ky library errors
      if ('response' in error) {
        const response = (error as { response: Response }).response;
        const errorData = await response.json().catch(() => undefined);
        throw new GrowiApiError('Failed to update page', response.status, {
          originalError: error.message,
          apiResponse: errorData,
        });
      }
    }

    throw new GrowiApiError('An unexpected error occurred while updating the page', 500, {
      originalError: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
