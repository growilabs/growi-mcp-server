import type { IPage } from '@growi/core/dist/interfaces';
import { container } from 'tsyringe';
import { GrowiApiError, isGrowiApiError } from '../commons/api/growi-api-error.js';
import { BaseService } from './base-service.js';

export const tokenPageService = 'PageService';

export interface GetPageTagResponse {
  tags: Array<{
    name: string;
    count: number;
  }>;
}

export interface GetAncestorsChildrenResponse {
  ancestorsChildren: {
    ancestor: IPage;
    children: IPage[];
  }[];
}

export interface UpdatePageParams {
  pageId: string;
  body: string;
  grant?: number;
  grantUserGroupId?: string;
  pageTags?: string[];
  revision?: string;
}

export interface GetRootPagesParams {
  limit?: number;
  offset?: number;
  sort?: string;
}

export interface RootPagesResponse {
  pages: IPage[];
  totalCount: number;
  offset?: number;
  limit?: number;
}

export interface RenamePageParams {
  pageId: string;
  newPagePath: string;
  revisionId?: string;
  isRenameRedirect?: boolean;
  isRecursively?: boolean;
  isMoveMode?: boolean;
  updateMetadata?: boolean;
}

export interface DeletePagesParams {
  pageIdToRevisionIdMap: Record<string, string>;
  isCompletely?: boolean;
  isRecursively?: boolean;
  isAnyoneWithTheLink?: boolean;
}

export interface DeletePagesResponse {
  paths: string[];
  isRecursively: boolean;
  isCompletely: boolean;
}

export interface IPageService {
  getPageTag(pageId: string): Promise<GetPageTagResponse>;
  getPage(pagePath: string): Promise<IPage>;
  updatePage(params: UpdatePageParams): Promise<IPage>;
  getRootPages(params?: GetRootPagesParams): Promise<RootPagesResponse>;
  getAncestorsChildren(pageId: string): Promise<GetAncestorsChildrenResponse>;
  renamePage(params: RenamePageParams): Promise<IPage>;
  deletePages(params: DeletePagesParams): Promise<DeletePagesResponse>;
}

/**
 * Service for handling GROWI page-related API operations
 */
class PageService extends BaseService implements IPageService {
  async getPageTag(pageId: string): Promise<GetPageTagResponse> {
    try {
      const response = await this.apiV1
        .get('pages.getPageTag', {
          searchParams: {
            pageId,
          },
        })
        .json<GetPageTagResponse>();

      if (!response.tags) {
        throw new GrowiApiError('Failed to get page tags', 500);
      }

      return response;
    } catch (error) {
      if (isGrowiApiError(error)) {
        throw error;
      }

      if (error instanceof Error) {
        // Handle ky library errors
        if ('response' in error) {
          const response = (error as { response: Response }).response;
          throw new GrowiApiError('Failed to get page tags from GROWI', response.status, await response.json().catch(() => undefined));
        }
      }

      throw new GrowiApiError('Unknown error occurred', 500, error);
    }
  }

  async getPage(pagePath: string): Promise<IPage> {
    try {
      const response = await this.apiV3
        .get('page', {
          searchParams: {
            path: pagePath,
          },
        })
        .json<{ page: IPage }>();

      if (!response.page) {
        throw new GrowiApiError('Page not found', 404);
      }

      return response.page;
    } catch (error) {
      if (isGrowiApiError(error)) {
        throw error;
      }

      if (error instanceof Error) {
        // Handle ky library errors
        if ('response' in error) {
          const response = (error as { response: Response }).response;
          throw new GrowiApiError('Failed to fetch page from GROWI', response.status, await response.json().catch(() => undefined));
        }
      }

      throw new GrowiApiError('Unknown error occurred', 500, error);
    }
  }

  async updatePage(params: UpdatePageParams): Promise<IPage> {
    try {
      const response = await this.apiV3
        .put('page', {
          json: {
            page_id: params.pageId,
            body: params.body,
            grant: params.grant,
            grantUserGroupId: params.grantUserGroupId,
            pageTags: params.pageTags,
            revision: params.revision,
          },
        })
        .json<{ page: IPage }>();

      if (!response.page) {
        throw new GrowiApiError('Failed to update page', 500);
      }

      return response.page;
    } catch (error) {
      if (isGrowiApiError(error)) {
        throw error;
      }

      if (error instanceof Error) {
        // Handle ky library errors
        if ('response' in error) {
          const response = (error as { response: Response }).response;
          throw new GrowiApiError('Failed to update page in GROWI', response.status, await response.json().catch(() => undefined));
        }
      }

      throw new GrowiApiError('Unknown error occurred', 500, error);
    }
  }
  async getRootPages(params?: GetRootPagesParams): Promise<RootPagesResponse> {
    try {
      const searchParams: Record<string, string | number> = {};
      if (params?.limit != null) {
        searchParams.limit = params.limit;
      }
      if (params?.offset != null) {
        searchParams.offset = params.offset;
      }
      if (params?.sort != null) {
        searchParams.sort = params.sort;
      }

      const response = await this.apiV3
        .get('page-listing/root', {
          searchParams,
        })
        .json<RootPagesResponse>();

      if (!response.pages) {
        throw new GrowiApiError('Root pages not found', 404);
      }

      return response;
    } catch (error) {
      if (isGrowiApiError(error)) {
        throw error;
      }

      if (error instanceof Error) {
        // Handle ky library errors
        if ('response' in error) {
          const response = (error as { response: Response }).response;
          throw new GrowiApiError('Failed to fetch root pages from GROWI', response.status, await response.json().catch(() => undefined));
        }
      }

      throw new GrowiApiError('Unknown error occurred', 500, error);
    }
  }
  async getAncestorsChildren(pageId: string): Promise<GetAncestorsChildrenResponse> {
    try {
      const response = await this.apiV3
        .get('page-listing/ancestors-children', {
          searchParams: {
            pageId,
          },
        })
        .json<GetAncestorsChildrenResponse>();

      if (!response.ancestorsChildren) {
        throw new GrowiApiError('Ancestors children not found', 404);
      }

      return response;
    } catch (error) {
      if (isGrowiApiError(error)) {
        throw error;
      }

      if (error instanceof Error) {
        // Handle ky library errors
        if ('response' in error) {
          const response = (error as { response: Response }).response;
          throw new GrowiApiError('Failed to fetch ancestors children from GROWI', response.status, await response.json().catch(() => undefined));
        }
      }

      throw new GrowiApiError('Unknown error occurred', 500, error);
    }
  }
  async renamePage(params: RenamePageParams): Promise<IPage> {
    try {
      const response = await this.apiV1
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
      if (isGrowiApiError(error)) {
        throw error;
      }

      if (error instanceof Error) {
        // Handle ky library errors
        if ('response' in error) {
          const response = (error as { response: Response }).response;
          throw new GrowiApiError('Failed to rename page in GROWI', response.status, await response.json().catch(() => undefined));
        }
      }

      throw new GrowiApiError('Unknown error occurred', 500, error);
    }
  }
  async deletePages(params: DeletePagesParams): Promise<DeletePagesResponse> {
    try {
      const response = await this.apiV3
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
        throw new GrowiApiError('Failed to delete pages', 500);
      }

      return response;
    } catch (error) {
      if (isGrowiApiError(error)) {
        throw error;
      }

      if (error instanceof Error) {
        // Handle ky library errors
        if ('response' in error) {
          const response = (error as { response: Response }).response;
          throw new GrowiApiError('Failed to delete pages in GROWI', response.status, await response.json().catch(() => undefined));
        }
      }

      throw new GrowiApiError('Unknown error occurred', 500, error);
    }
  }
}

container.registerSingleton(tokenPageService, PageService);
