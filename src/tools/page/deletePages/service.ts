import { apiV1 } from '../../../commons/api/client-v1.js';
import { apiV3 } from '../../../commons/api/client-v3.js';
import { GrowiApiError, isGrowiApiError } from '../../../commons/api/growi-api-error.js';
import type { ApiV1Response } from '../../../commons/api/growi-api-v1-response.js';
import type { DeletePagesParam, DeletePagesResponse, PageDeleteV1Response } from './schema.js';
import { pageDeleteV1ResponseSchema } from './schema.js';

export const deletePages = async (params: DeletePagesParam): Promise<DeletePagesResponse> => {
  try {
    // Get the number of pages to delete
    const pageCount = Object.keys(params.pageIdToRevisionIdMap).length;

    // For single page deletion, use v1 API
    if (pageCount === 1) {
      const pageId = Object.keys(params.pageIdToRevisionIdMap)[0];
      const revisionId = params.pageIdToRevisionIdMap[pageId];

      const response = await apiV1
        .post('pages.remove', {
          json: {
            page_id: pageId,
            revision_id: revisionId,
            completely: params.isCompletely || false,
            recursively: params.isRecursively || false,
          },
        })
        .json<ApiV1Response<PageDeleteV1Response>>();

      if (!response.ok || response.error) {
        const statusCode = response.code ? Number.parseInt(response.code, 10) : 500;
        throw new GrowiApiError(response.error || 'Unknown error occurred', statusCode);
      }

      const result = pageDeleteV1ResponseSchema.safeParse(response.data);
      if (!result.success) {
        throw new GrowiApiError('The API response data is invalid', 500);
      }

      return {
        paths: [result.data.path],
        isRecursively: result.data.isRecursively,
        isCompletely: result.data.isCompletely,
      };
    }

    // For multiple pages deletion, use v3 API
    const response = await apiV3
      .post('/pages/delete', {
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
