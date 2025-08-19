import apiv3 from '@growi/sdk-typescript/v3';
import type { PostPage201, PostPageBody } from '@growi/sdk-typescript/v3';
import { GrowiApiError } from '../../../commons/api/growi-api-error.js';

export type CreatePageParam = PostPageBody;
export type CreatePageResponse = PostPage201;

export const createPage = async (params: CreatePageParam): Promise<CreatePageResponse> => {
  try {
    // Check if page exists
    const existResponse = await apiv3.getExistForPage({
      path: params.path,
    });

    if (existResponse.isExist) {
      throw new GrowiApiError('Page with this path already exists', 409, { path: params.path });
    }

    // Create page using SDK
    const response = await apiv3.postPage(params);

    if (!response?.page) {
      throw new GrowiApiError('Invalid response received from page creation API', 500, { response });
    }

    return response;
  } catch (error) {
    if (error instanceof GrowiApiError) {
      throw error;
    }

    // Handle SDK errors
    const message = error instanceof Error ? error.message : String(error);
    const statusCode = error instanceof Error && 'response' in error ? (error as { response?: { status?: number } }).response?.status || 500 : 500;

    throw new GrowiApiError(`Failed to create page: ${message}`, statusCode, { originalError: error, path: params.path });
  }
};
