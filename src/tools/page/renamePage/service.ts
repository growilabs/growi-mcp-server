import { apiV3 } from '../../../commons/api/client-v3.js';
import { GrowiApiError, isGrowiApiError } from '../../../commons/api/growi-api-error.js';
import type { IPage, RenamePageParam } from './schema.js';

export async function renamePage(params: RenamePageParam): Promise<IPage> {
  try {
    // Check if pages exist at the new path
    const existResponse = await apiV3
      .get('pages/exist-paths', {
        searchParams: {
          fromPath: params.newPagePath,
          toPath: params.newPagePath,
        },
      })
      .json<{ existPaths: Record<string, boolean> }>();

    if (existResponse.existPaths && Object.keys(existResponse.existPaths).length > 0) {
      throw new GrowiApiError('Page already exists at the target path', 409);
    }

    // Proceed with renaming
    const response = await apiV3
      .post('/pages/rename', {
        json: {
          pageId: params.pageId,
          revisionId: params.revisionId,
          newPagePath: params.newPagePath,
          isRenameRedirect: params.isRenameRedirect ?? false,
          isRecursively: params.isRecursively ?? false,
          updateMetadata: params.updateMetadata ?? false,
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
      const responseData = await response.json().catch(() => undefined);

      if (response.status === 409) {
        throw new GrowiApiError('Page already exists at the target path', 409, responseData);
      }
      if (response.status === 401) {
        throw new GrowiApiError('Invalid page ID', 401, responseData);
      }

      throw new GrowiApiError('Failed to rename page in GROWI', response.status, responseData);
    }

    if (isGrowiApiError(error)) {
      throw error;
    }

    throw new GrowiApiError('An unexpected error occurred', 500, error);
  }
}
