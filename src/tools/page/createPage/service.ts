import { apiV3 } from '../../../commons/api/client-v3';
import { GrowiApiError, isGrowiApiError } from '../../../commons/api/growi-api-error';
import type { CreatePageParam, CreatePageResponse } from './schema';

export const createPage = async (params: CreatePageParam): Promise<CreatePageResponse> => {
  try {
    // First, check if the page exists using apiV3
    const existResponse = await apiV3
      .get('page/exist', {
        searchParams: {
          path: params.path,
        },
      })
      .json<{ exists: boolean }>();

    // If the page exists, throw an error
    if (existResponse.exists) {
      throw new GrowiApiError('Page with this path already exists', 409, { path: params.path });
    }

    // Create the page using apiV3
    const response = await apiV3
      .post('page', {
        json: {
          path: params.path,
          body: params.body,
          grant: params.grant,
        },
      })
      .json<CreatePageResponse>();

    if (!response.data?.page) {
      throw new GrowiApiError('Invalid response received from page creation API', 500, { response });
    }

    return response;
  } catch (error) {
    // If it's already a GrowiApiError, rethrow it
    if (isGrowiApiError(error)) {
      throw error;
    }

    // Handle ky library errors with response
    if (error instanceof Error && 'response' in error) {
      const response = (error as { response: Response }).response;
      const errorData = await response.json().catch(() => undefined);

      // Provide more specific error messages based on status codes
      let message = 'Failed to create page';
      if (response.status === 400) {
        message = 'Invalid page creation request';
      } else if (response.status === 401) {
        message = 'Authentication required to create page';
      } else if (response.status === 403) {
        message = 'Insufficient permissions to create page';
      } else if (response.status === 409) {
        message = 'Page path already exists';
      }

      throw new GrowiApiError(message, response.status, {
        errorData,
        path: params.path,
      });
    }

    // Handle network or other unexpected errors
    throw new GrowiApiError('An unexpected error occurred while creating the page', 500, {
      error: error instanceof Error ? error.message : error,
      path: params.path,
    });
  }
};
