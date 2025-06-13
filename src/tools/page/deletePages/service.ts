import apiv1 from '@growi/sdk-typescript/v1';
import type { RemovePageBody } from '@growi/sdk-typescript/v1';
import apiv3 from '@growi/sdk-typescript/v3';
import type { PostDeleteForPagesBody } from '@growi/sdk-typescript/v3';
import { GrowiApiError } from '../../../commons/api/growi-api-error.js';
import type { DeletePagesParam, DeletePagesResponse } from './schema.js';

export const deletePages = async (params: DeletePagesParam): Promise<DeletePagesResponse> => {
  try {
    // Get the number of pages to delete
    const pageCount = Object.keys(params.pageIdToRevisionIdMap).length;

    // For single page deletion, use v1 API
    if (pageCount === 1) {
      const pageId = Object.keys(params.pageIdToRevisionIdMap)[0];
      const revisionId = params.pageIdToRevisionIdMap[pageId];

      const removePageBody: RemovePageBody = {
        page_id: pageId,
        revision_id: revisionId,
        completely: params.isCompletely ?? false,
        recursively: params.isRecursively ?? false,
      };

      const response = await apiv1.removePage(removePageBody);

      if (!response.path) {
        throw new GrowiApiError('Failed to delete page: No path returned', 500);
      }

      return {
        paths: [response.path],
        isRecursively: response.isRecursively ?? false,
        isCompletely: response.isCompletely ?? false,
      };
    }

    // For multiple pages deletion, use v3 API
    const postDeleteBody: PostDeleteForPagesBody = {
      pageIdToRevisionIdMap: params.pageIdToRevisionIdMap,
      isCompletely: params.isCompletely ?? false,
      isRecursively: params.isRecursively ?? false,
      isAnyoneWithTheLink: params.isAnyoneWithTheLink,
    };

    const response = await apiv3.postDeleteForPages(postDeleteBody);

    if (!response.paths) {
      throw new GrowiApiError('The API response is missing required data', 500);
    }

    return {
      paths: response.paths,
      isRecursively: response.isRecursively ?? false,
      isCompletely: response.isCompletely ?? false,
    };
  } catch (error) {
    // エラーを GrowiApiError としてラップ
    if (error instanceof Error) {
      throw new GrowiApiError(error.message, 500, error);
    }
    throw new GrowiApiError('An unexpected error occurred while deleting pages', 500, error);
  }
};
