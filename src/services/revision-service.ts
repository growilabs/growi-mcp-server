import type { IRevisionHasId, IRevisionsForPagination } from '@growi/core';
import { container } from 'tsyringe';
import { GrowiApiError, isGrowiApiError } from '../commons/api/growi-api-error.js';
import { BaseService } from './base-service.js';

export const tokenRevisionService = 'RevisionService';

export interface GetRevisionsParams {
  pageId?: string;
  limit?: number;
  offset?: number;
}

export type GetRevisionsResponse = {
  revisions: IRevisionHasId[];
  totalCount: number;
  offset?: number;
};

export type GetRevisionResponse = {
  revision: IRevisionHasId;
};

export interface IRevisionService {
  getRevisions(params: GetRevisionsParams): Promise<GetRevisionsResponse>;
  getRevision(id: string): Promise<GetRevisionResponse>;
}

/**
 * Service for handling GROWI revision-related API operations
 */
class RevisionService extends BaseService implements IRevisionService {
  async getRevisions(params: GetRevisionsParams): Promise<GetRevisionsResponse> {
    try {
      const searchParams: Record<string, string | number> = {};
      if (params.pageId != null) {
        searchParams.pageId = params.pageId;
      }
      if (params.limit != null) {
        searchParams.limit = params.limit;
      }
      if (params.offset != null) {
        searchParams.offset = params.offset;
      }

      const response = await this.apiV3
        .get('revisions/list', {
          searchParams,
        })
        .json<GetRevisionsResponse>();

      if (!response.revisions) {
        throw new GrowiApiError('Revisions not found', 404);
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
          throw new GrowiApiError('Failed to fetch revisions from GROWI', response.status, await response.json().catch(() => undefined));
        }
      }

      throw new GrowiApiError('Unknown error occurred', 500, error);
    }
  }

  async getRevision(id: string): Promise<GetRevisionResponse> {
    try {
      const response = await this.apiV3.get(`revisions/${id}`).json<GetRevisionResponse>();

      if (!response.revision) {
        throw new GrowiApiError('Revision not found', 404);
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
          throw new GrowiApiError('Failed to fetch revision from GROWI', response.status, await response.json().catch(() => undefined));
        }
      }

      throw new GrowiApiError('Unknown error occurred', 500, error);
    }
  }
}

container.registerSingleton(tokenRevisionService, RevisionService);
