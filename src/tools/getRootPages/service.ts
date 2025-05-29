import { apiV3 } from '../../commons/api/client-v3.js';
import { GrowiApiError, isGrowiApiError } from '../../commons/api/growi-api-error.js';
import type { GetRootPagesParam, RootPagesResponse } from './schema.js';

export async function getRootPages(params?: GetRootPagesParam): Promise<RootPagesResponse> {
  try {
    const searchParams: Record<string, string | number> = {};
    if (params?.limit != null) {
      searchParams.limit = params.limit;
    }
    if (params?.offset != null) {
      searchParams.offset = params.offset;
    }
    if (params?.sort != null) {
      searchParams.sort = params.sort;
    }

    const response = await apiV3
      .get('page-listing/root', {
        searchParams,
      })
      .json<RootPagesResponse>();

    if (!response.pages) {
      throw new GrowiApiError('Root pages not found', 404);
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
        throw new GrowiApiError('Failed to fetch root pages from GROWI', response.status, await response.json().catch(() => undefined));
      }
    }

    throw new GrowiApiError('Unknown error occurred', 500, error);
  }
}
