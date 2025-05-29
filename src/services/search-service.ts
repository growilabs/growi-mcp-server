import type { IPageHasId, IRevisionHasId } from '@growi/core';
import { container } from 'tsyringe';
import { GrowiApiError, isGrowiApiError } from '../commons/api/growi-api-error.js';
import { BaseService } from './base-service.js';

export const tokenSearchService = 'SearchService';

export interface SearchIndicesResponse {
  info: {
    docs: {
      total: number;
      deleted: number;
    };
    store: {
      size: number;
    };
    indexing: {
      total: number;
      failed: number;
    };
  };
}

export interface SearchResponse {
  meta: {
    took: number;
    total: number;
    results: number;
  };
  data: Array<
    IPageHasId & {
      body: string;
      revision?: IRevisionHasId;
    }
  >;
}

export interface ISearchService {
  search(query: string, limit?: number, offset?: number, sort?: string): Promise<SearchResponse>;
  getIndices(): Promise<SearchIndicesResponse>;
}

/**
 * Service for handling GROWI search-related API operations
 * @deprecated
 */
class SearchService extends BaseService implements ISearchService {
  async search(query: string, limit?: number, offset?: number, sort?: string): Promise<SearchResponse> {
    try {
      const searchParams: Record<string, string | number> = {
        q: query,
      };

      if (limit != null) {
        searchParams.limit = limit;
      }
      if (offset != null) {
        searchParams.offset = offset;
      }
      if (sort != null) {
        searchParams.sort = sort;
      }

      const response = await this.apiV1
        .get('search', {
          searchParams,
        })
        .json<SearchResponse>();

      if (!response.data) {
        throw new GrowiApiError('Failed to get search results', 500);
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
          throw new GrowiApiError('Failed to search in GROWI', response.status, await response.json().catch(() => undefined));
        }
      }

      throw new GrowiApiError('Unknown error occurred', 500, error);
    }
  }
  async getIndices(): Promise<SearchIndicesResponse> {
    try {
      const response = await this.apiV1.get('search/indices').json<SearchIndicesResponse>();

      if (!response.info) {
        throw new GrowiApiError('Invalid response format', 500);
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
          throw new GrowiApiError('Failed to get indices info', response.status, await response.json().catch(() => undefined));
        }
      }

      throw new GrowiApiError('Unknown error occurred', 500, error);
    }
  }
}

container.registerSingleton(tokenSearchService, SearchService);
