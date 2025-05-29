import type { IPage } from '@growi/core/dist/interfaces';
import { apiV3 } from '../../commons/api/client-v3.js';
import { GrowiApiError, isGrowiApiError } from '../../commons/api/growi-api-error.js';
import type { GetPageParam } from './schema.js';

export async function getPage(params: GetPageParam): Promise<IPage> {
  try {
    const response = await apiV3
      .get('page', {
        searchParams: {
          path: params.pagePath,
        },
      })
      .json<{ page: IPage }>();

    if (!response.page) {
      throw new GrowiApiError('Page not found', 404);
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
        throw new GrowiApiError('Failed to fetch page from GROWI', response.status, await response.json().catch(() => undefined));
      }
    }

    throw new GrowiApiError('Unknown error occurred', 500, error);
  }
}
