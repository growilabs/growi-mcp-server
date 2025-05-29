import type { IExternalAccount, IPageHasId, IRevisionHasId, IUserHasId } from '@growi/core/dist/interfaces';
import { container } from 'tsyringe';
import { GrowiApiError } from '../commons/api/growi-api-error.js';
import { BaseService } from './base-service.js';

export const tokenUserService = 'UserService';

export interface LoginParams {
  username: string;
  password: string;
}

export interface GetUserPagesParams {
  userId: string;
  limit?: number;
  offset?: number;
  sort?: string;
  status?: string;
}

export type UserPage = Pick<IPageHasId, '_id' | 'path' | 'status' | 'grant' | 'descendantCount' | 'isEmpty'> & {
  revision: Pick<IRevisionHasId, '_id' | 'body'>;
  createdAt: string;
  updatedAt: string;
};

export interface UserPagesResponse {
  pages: UserPage[];
}

export type AuthProviderType = 'local' | 'ldap' | 'saml' | 'oidc' | 'google' | 'github';

export type ExternalAccount = IExternalAccount<AuthProviderType> & {
  _id: string;
  createdAt: string;
};

/**
 * Response type for getExternalAccounts
 * Contains array of external authentication accounts linked to a user
 */
export interface ExternalAccountsResponse {
  externalAccounts: ExternalAccount[];
}

export interface MeResponse {
  user: IUserHasId;
}

export interface RegisterParams {
  username: string;
  password: string;
  name?: string;
  email?: string;
}

export interface RegisterResponse {
  user: IUserHasId;
}

export interface IUserService {
  /**
   * Register a new user
   * @throws {GrowiApiError} when registration fails (e.g., username taken) or other API errors occur
   */
  register(params: RegisterParams): Promise<RegisterResponse>;

  /**
   * Get current user information
   * @throws {GrowiApiError} when user info retrieval fails or other API errors occur
   */
  me(): Promise<MeResponse>;

  /**
   * Get external accounts for a user
   * @param userId The ID of the user to get external accounts for
   * @throws {GrowiApiError} when external accounts retrieval fails or other API errors occur
   */
  getExternalAccounts(userId: string): Promise<ExternalAccountsResponse>;

  /**
   * Get pages created by a specific user
   * @param params Parameters for retrieving user pages
   * @throws {GrowiApiError} when pages retrieval fails or other API errors occur
   */
  getPages(params: GetUserPagesParams): Promise<UserPagesResponse>;
}

/**
 * Service for handling GROWI user-related API operations
 * @deprecated
 */
class UserService extends BaseService implements IUserService {
  async register(params: RegisterParams): Promise<RegisterResponse> {
    try {
      const response = await this.apiV1
        .post('register', {
          json: {
            registerForm: params,
          },
        })
        .json<RegisterResponse>();

      if (!response.user) {
        throw new GrowiApiError('Registration failed', 400);
      }

      return response;
    } catch (error) {
      if (error instanceof GrowiApiError) {
        if (error.statusCode === 409) {
          throw new GrowiApiError('Username is already taken', 409);
        }
        if (error.statusCode === 400) {
          throw new GrowiApiError('Invalid registration data', 400);
        }
        throw error;
      }
      throw new GrowiApiError('Registration failed', 500, error);
    }
  }

  async me(): Promise<MeResponse> {
    try {
      const response = await this.apiV3.get('me').json<MeResponse>();

      if (!response.user) {
        throw new GrowiApiError('Failed to get user info', 401);
      }

      return response;
    } catch (error) {
      if (error instanceof GrowiApiError) {
        throw error;
      }
      throw new GrowiApiError('Failed to get user info', 500, error);
    }
  }
  async getExternalAccounts(userId: string): Promise<ExternalAccountsResponse> {
    try {
      const response = await this.apiV3.get(`users/${userId}/external-accounts`).json<ExternalAccountsResponse>();

      if (!response.externalAccounts) {
        throw new GrowiApiError('Failed to get external accounts', 404);
      }

      return response;
    } catch (error) {
      if (error instanceof GrowiApiError) {
        throw error;
      }
      throw new GrowiApiError('Failed to get external accounts', 500, error);
    }
  }

  async getPages(params: GetUserPagesParams): Promise<UserPagesResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params.limit !== undefined) queryParams.set('limit', params.limit.toString());
      if (params.offset !== undefined) queryParams.set('offset', params.offset.toString());
      if (params.sort) queryParams.set('sort', params.sort);
      if (params.status) queryParams.set('status', params.status);

      const response = await this.apiV3.get(`users/${params.userId}/pages?${queryParams.toString()}`).json<UserPagesResponse>();

      if (!response.pages) {
        throw new GrowiApiError('Failed to get user pages', 404);
      }

      return response;
    } catch (error) {
      if (error instanceof GrowiApiError) {
        if (error.statusCode === 404) {
          throw new GrowiApiError('User not found', 404);
        }
        if (error.statusCode === 403) {
          throw new GrowiApiError('Access denied', 403);
        }
        throw error;
      }
      throw new GrowiApiError('Failed to get user pages', 500, error);
    }
  }
}

container.registerSingleton(tokenUserService, UserService);
