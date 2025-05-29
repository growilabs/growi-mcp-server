import { apiV3 } from '../../../commons/api/client-v3.js';
import { GrowiApiError, isGrowiApiError } from '../../../commons/api/growi-api-error.js';
import type { DeletePagesParam, DeletePagesResponse } from './schema.js';

export const deletePages = async (params: DeletePagesParam): Promise<DeletePagesResponse> => {
  try {
    const response = await apiV3
      .post('pages/delete', {
        json: {
          pageIdToRevisionIdMap: params.pageIdToRevisionIdMap,
          isCompletely: params.isCompletely,
          isRecursively: params.isRecursively,
          isAnyoneWithTheLink: params.isAnyoneWithTheLink,
        },
      })
      .json<DeletePagesResponse>();

    if (!response.paths) {
      throw new GrowiApiError('The API response is missing required data', 500);
    }

    return response;
  } catch (error) {
    if (isGrowiApiError(error)) {
      throw error;
    }

    // Handle ky library errors
    if (error instanceof Error && 'response' in error) {
      const response = (error as { response: Response }).response;
      throw new GrowiApiError('Failed to delete pages through the API', response.status, await response.json().catch(() => undefined));
    }

    // Handle unexpected errors
    throw new GrowiApiError('An unexpected error occurred while deleting pages', 500, error);
  }
};
