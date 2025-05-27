import type { IPage } from '@growi/core/dist/interfaces';
import { container } from 'tsyringe';
import { BaseService } from './base-service.js';
import { GrowiApiError, isGrowiApiError } from './growi-api-error.js';

export const tokenPageService = 'PageService';

export interface IPageService {
  getPage(pagePath: string): Promise<IPage>;
}

/**
 * Service for handling GROWI page-related API operations
 */
class PageService extends BaseService implements IPageService {
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
}

container.registerSingleton(tokenPageService, PageService);
