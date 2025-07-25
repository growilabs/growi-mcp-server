import apiv3 from '@growi/sdk-typescript/v3';
import type { Page } from '@growi/sdk-typescript/v3';
import { GrowiApiError } from '../../../commons/api/growi-api-error';
import type { DuplicatePageParams } from './schema';

export const duplicatePage = async (params: DuplicatePageParams): Promise<Page> => {
  try {
    // Check if target path exists
    if (params.pageNameInput) {
      const existPathResult = await apiv3.getExistPathsForPage({
        toPath: params.pageNameInput,
      });

      // If path exists, throw error
      if (existPathResult.existPaths?.[params.pageNameInput]) {
        throw new GrowiApiError('Target path already exists', 400);
      }
    }

    // Execute duplicate operation
    const result = await apiv3.postDuplicateForPages({
      pageId: params.pageId,
      pageNameInput: params.pageNameInput,
      isRecursively: params.isRecursively,
      onlyDuplicateUserRelatedResources: params.onlyDuplicateUserRelatedResources,
    });

    if (!result.page) {
      throw new GrowiApiError('Failed to duplicate page: Response data is invalid', 500);
    }

    return result.page;
  } catch (error) {
    if (error instanceof GrowiApiError) {
      throw error;
    }
    throw new GrowiApiError(`Failed to duplicate page: ${error}`, 500);
  }
};
