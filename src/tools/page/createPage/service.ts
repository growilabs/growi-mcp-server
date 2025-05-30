import type { IPage } from '@growi/core/dist/interfaces';
import { apiV1 } from '../../../commons/api/client-v1';
import { GrowiApiError, isGrowiApiError } from '../../../commons/api/growi-api-error';
import type { CreatePageParam } from './schema';

export const createPage = async (params: CreatePageParam): Promise<IPage> => {
  try {
    const response = await apiV1
      .post('/pages', {
        json: {
          path: params.path,
          body: params.body,
          grant: params.grant,
          overwrite: params.overwrite,
        },
      })
      .json<{ page: IPage }>();

    if (!response.page) {
      throw new GrowiApiError('Page creation response is invalid', 500);
    }

    return response.page;
  } catch (error) {
    // If it's already a GrowiApiError, rethrow it
    if (isGrowiApiError(error)) {
      throw error;
    }

    // Handle ky library errors with response
    if (error instanceof Error && 'response' in error) {
      const response = (error as { response: Response }).response;
      const errorData = await response.json().catch(() => undefined);
      throw new GrowiApiError('Failed to create page in GROWI', response.status, errorData);
    }

    // Handle network or other unexpected errors
    throw new GrowiApiError('An unexpected error occurred while creating the page', 500, error instanceof Error ? error.message : error);
  }
};
