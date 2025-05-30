import { apiV1 } from '../../commons/api/client-v1.js';
import { GrowiApiError, isGrowiApiError } from '../../commons/api/growi-api-error.js';

export interface GetPageTagParams {
  pageId: string;
}

export interface GetPageTagResponse {
  tags: Array<{
    name: string;
    count: number;
  }>;
}

export async function getPageTags(params: GetPageTagParams): Promise<GetPageTagResponse> {
  try {
    const response = await apiV1
      .get('pages.getPageTag', {
        searchParams: {
          pageId: params.pageId,
        },
      })
      .json<GetPageTagResponse>();

    if (!response.tags) {
      throw new GrowiApiError('Failed to get page tags', 500);
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
        throw new GrowiApiError('Failed to get page tags from GROWI', response.status, await response.json().catch(() => undefined));
      }
    }

    throw new GrowiApiError('Unknown error occurred', 500, error);
  }
}
