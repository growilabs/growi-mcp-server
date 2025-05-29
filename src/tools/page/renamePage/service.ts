import { apiV1 } from '../../../commons/api/client-v1.js';
import { GrowiApiError, isGrowiApiError } from '../../../commons/api/growi-api-error.js';
import type { IPage, RenamePageParam } from './schema.js';

export async function renamePage(params: RenamePageParam): Promise<IPage> {
  try {
    const response = await apiV1
      .post('pages/rename', {
        json: {
          page_id: params.pageId,
          new_path: params.newPagePath,
          revision_id: params.revisionId,
          rename_redirect: params.isRenameRedirect,
          recursively: params.isRecursively,
          move_mode: params.isMoveMode,
          update_metadata: params.updateMetadata,
        },
      })
      .json<{ page: IPage }>();

    if (!response.page) {
      throw new GrowiApiError('Failed to rename page', 500);
    }

    return response.page;
  } catch (error) {
    // Handle ky library errors
    if (error instanceof Error && 'response' in error) {
      const response = (error as { response: Response }).response;
      throw new GrowiApiError('Failed to rename page in GROWI', response.status, await response.json().catch(() => undefined));
    }

    if (isGrowiApiError(error)) {
      throw error;
    }

    throw new GrowiApiError('An unexpected error occurred', 500, error);
  }
}
