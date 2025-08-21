import apiv3 from '@growi/sdk-typescript/v3';
import type { Page } from '@growi/sdk-typescript/v3';
import { GrowiApiError } from '../../../commons/api/growi-api-error';
import type { DuplicatePageParams } from './schema';

export const duplicatePage = async (params: DuplicatePageParams): Promise<Page> => {
  try {
    // Check if target path exists
    if (params.pageNameInput) {
      // Check if page exists
      const existResponse = await apiv3.getExistForPage({
        path: params.pageNameInput,
      });

      // If path exists, throw error
      if (existResponse.isExist) {
        throw new GrowiApiError('Page with this path already exists', 409, { path: params.pageNameInput });
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
