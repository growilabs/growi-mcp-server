import { apiV3 } from '../../commons/api/client-v3.js';
import { GrowiApiError, isGrowiApiError } from '../../commons/api/growi-api-error.js';
import type { GetAncestorsChildrenParam, GetAncestorsChildrenResponse } from './schema.js';

export async function getAncestorsChildren(params: GetAncestorsChildrenParam): Promise<GetAncestorsChildrenResponse> {
  try {
    const response = await apiV3
      .get('page-listing/ancestors-children', {
        searchParams: {
          pageId: params.pageId,
        },
      })
      .json<GetAncestorsChildrenResponse>();

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
