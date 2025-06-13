import { apiV3 } from '../../commons/api/client-v3.js';
import { GrowiApiError, isGrowiApiError } from '../../commons/api/growi-api-error.js';

export interface GetPageListingRootResponse {
  pages: unknown[];
}

export async function getPageListingRoot(): Promise<GetPageListingRootResponse> {
  try {
    const response = await apiV3.get('page-listing/root').json<GetPageListingRootResponse>();

    if (!response.pages) {
      throw new GrowiApiError('Root page listing not found', 404);
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
        throw new GrowiApiError('Failed to fetch root page listing from GROWI', response.status, await response.json().catch(() => undefined));
      }
    }

    throw new GrowiApiError('Unknown error occurred', 500, error);
  }
}
