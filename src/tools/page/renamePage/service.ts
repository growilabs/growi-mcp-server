import apiv3 from '@growi/sdk-typescript/v3';
import type { PutRenameForPages200 } from '@growi/sdk-typescript/v3';
import { GrowiApiError } from '../../../commons/api/growi-api-error.js';
import type { RenamePageParam } from './schema.js';

export async function renamePage(params: RenamePageParam, appName: string): Promise<PutRenameForPages200> {
  try {
    // Check if pages exist at the new path using SDK only if both paths are provided
    if (params.path && params.newPagePath) {
      const existPathsResult = await apiv3.getExistPathsForPage(
        {
          fromPath: params.path,
          toPath: params.newPagePath,
        },
        { appName },
      );

      if (existPathsResult.existPaths?.[params.newPagePath]) {
        throw new GrowiApiError('Page already exists at the target path', 409, {
          path: params.newPagePath,
        });
      }
    }

    // Proceed with renaming using SDK
    const renameResult = await apiv3.putRenameForPages(
      {
        pageId: params.pageId,
        revisionId: params.revisionId,
        ...(params.newPagePath && { newPagePath: params.newPagePath }),
        ...(params.isRenameRedirect !== undefined && { isRenameRedirect: params.isRenameRedirect }),
        ...(params.isRecursively !== undefined && { isRecursively: params.isRecursively }),
        ...(params.updateMetadata !== undefined && { updateMetadata: params.updateMetadata }),
      },
      { appName },
    );

    if (!renameResult.page) {
      throw new GrowiApiError('Invalid response received from page rename API', 500, { response: renameResult });
    }

    return renameResult;
  } catch (error: unknown) {
    if (error instanceof GrowiApiError) {
      throw error;
    }

    // Handle SDK errors
    const message = error instanceof Error ? error.message : String(error);
    const statusCode = error instanceof Error && 'response' in error ? (error as { response?: { status?: number } }).response?.status || 500 : 500;
    const details = {
      originalError: error,
      pageId: params.pageId,
      ...(params.path && { fromPath: params.path }),
      ...(params.newPagePath && { newPagePath: params.newPagePath }),
    };

    if (statusCode === 409) {
      throw new GrowiApiError('Page already exists at the target path', statusCode, details);
    }
    if (statusCode === 401) {
      throw new GrowiApiError('Invalid page ID or insufficient permissions', statusCode, details);
    }
    if (statusCode === 400) {
      throw new GrowiApiError('Invalid request parameters', statusCode, details);
    }

    throw new GrowiApiError(`Failed to rename page: ${message}`, statusCode, details);
  }
}
