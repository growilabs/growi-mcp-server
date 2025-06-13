import { apiV3 } from '../../commons/api/client-v3.js';
import { GrowiApiError, isGrowiApiError } from '../../commons/api/growi-api-error.js';

export interface GetPageListingChildrenParams {
  id?: string;
  path?: string;
}

export interface GetPageListingChildrenResponse {
  children: unknown[];
}

export async function getPageListingChildren(params: GetPageListingChildrenParams): Promise<GetPageListingChildrenResponse> {
  try {
    const searchParams: Record<string, string> = {};

    if (params.id) {
      searchParams.id = params.id;
    }
    if (params.path) {
      searchParams.path = params.path;
    }

    const response = await apiV3
      .get('page-listing/children', {
        searchParams,
      })
      .json<GetPageListingChildrenResponse>();

    if (!response.children) {
      throw new GrowiApiError('Page listing children not found', 404);
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
        throw new GrowiApiError('Failed to fetch page listing children from GROWI', response.status, await response.json().catch(() => undefined));
      }
    }

    throw new GrowiApiError('Unknown error occurred', 500, error);
  }
}
