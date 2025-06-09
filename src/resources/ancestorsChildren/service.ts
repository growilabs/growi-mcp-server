import type { IPage } from '@growi/core/dist/interfaces';
import { apiV3 } from '../../commons/api/client-v3.js';
import { GrowiApiError, isGrowiApiError } from '../../commons/api/growi-api-error.js';

export type ListAncestorsChildrenParams = {
  pageId: string;
};

export interface ListAncestorsChildrenResponse {
  ancestorsChildren: {
    ancestor: IPage;
    children: IPage[];
  }[];
}

export async function listAncestorsChildren(params: ListAncestorsChildrenParams): Promise<ListAncestorsChildrenResponse> {
  try {
    const response = await apiV3
      .get('page-listing/ancestors-children', {
        searchParams: {
          pageId: params.pageId,
        },
      })
      .json<ListAncestorsChildrenResponse>();

    if (!response.ancestorsChildren) {
      throw new GrowiApiError('Ancestors children not found', 404);
    }

    return response;
  } catch (error) {
    if (isGrowiApiError(error)) {
      throw error;
    }

    if (error instanceof Error) {
      // Handle ky library errors
      if ('response' in error) {
        const response = (error as { response: Response }).response;
        throw new GrowiApiError('Failed to fetch ancestors children from GROWI', response.status, await response.json().catch(() => undefined));
      }
    }

    throw new GrowiApiError('Unknown error occurred', 500, error);
  }
}
