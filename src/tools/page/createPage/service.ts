import type { IPage } from '@growi/core/dist/interfaces';
import { apiV1 } from '../../../commons/api/client-v1';
import { GrowiApiError, isGrowiApiError } from '../../../commons/api/growi-api-error';
import type { CreatePageParam } from './schema';

export const createPage = async (params: CreatePageParam): Promise<IPage> => {
  try {
    const response = await apiV1
      .post('pages', {
        json: {
          path: params.path,
          body: params.body,
          grant: params.grant,
          overwrite: params.overwrite,
        },
      })
      .json<{ page: IPage }>();

    if (!response.page) {
      throw new GrowiApiError('Failed to create page', 500);
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
        throw new GrowiApiError('Failed to create page in GROWI', response.status, await response.json().catch(() => undefined));
      }
    }

    throw new GrowiApiError('Unknown error occurred', 500, error);
  }
};
