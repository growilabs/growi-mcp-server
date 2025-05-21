import ky from 'ky';
import config from '../config/default';

export interface GrowiPage {
  _id: string;
  path: string;
  revision: {
    _id: string;
    body: string;
    createdAt: string;
    author: {
      _id: string;
      username: string;
    };
  };
  creator: {
    _id: string;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
}

export class GrowiApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'GrowiApiError';
  }
}

export class GrowiService {
  private readonly apiV1: typeof ky;
  private readonly apiV3: typeof ky;

  constructor() {
    if (!config.growi.baseUrl) {
      throw new Error('GROWI base URL is not configured');
    }
    if (!config.growi.apiToken) {
      throw new Error('GROWI API token is not configured');
    }

    this.apiV1 = ky.create({
      prefixUrl: `${config.growi.baseUrl}/_api/`,
      headers: {
        Authorization: `Bearer ${config.growi.apiToken}`,
      },
      timeout: 10000,
    });

    this.apiV3 = ky.create({
      prefixUrl: `${config.growi.baseUrl}/_api/v3/`,
      headers: {
        Authorization: `Bearer ${config.growi.apiToken}`,
      },
      timeout: 10000,
    });
  }

  async getPage(pagePath: string): Promise<GrowiPage> {
    try {
      const response = await this.apiV3
        .get('page', {
          searchParams: {
            path: pagePath,
          },
        })
        .json<{ page: GrowiPage }>();

      if (!response.page) {
        throw new GrowiApiError('Page not found', 404);
      }

      return response.page;
    } catch (error) {
      if (error instanceof GrowiApiError) {
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
