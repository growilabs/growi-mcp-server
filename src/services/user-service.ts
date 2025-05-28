import { container } from 'tsyringe';
import { BaseService } from './base-service.js';
import { GrowiApiError } from './growi-api-error.js';

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

export interface UserPage {
  _id: string;
  path: string;
  revision: {
    _id: string;
    body: string;
  };
  status: string;
  grant: number;
  descendantCount: number;
  isEmpty: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPagesResponse {
  pages: UserPage[];
}

export interface ExternalAccount {
  id: string;
  providerType: string;
  accountId: string;
  createdAt: string;
  user: string;
}

export interface ExternalAccountsResponse {
  externalAccounts: ExternalAccount[];
}

export interface MeResponse {
  user: {
    _id: string;
    name: string;
    username: string;
    email: string;
    lang: string;
    status: string;
    admin: boolean;
    createdAt: string;
  };
}

export interface LoginResponse {
  user: {
    [key: string]: unknown;
  };
}

export interface RegisterParams {
  username: string;
  password: string;
  name?: string;
  email?: string;
}

export interface RegisterResponse {
  user: {
    [key: string]: unknown;
  };
}

export interface IUserService {
  /**
   * Authenticate user with username and password
   * @throws {GrowiApiError} when authentication fails or other API errors occur
   */
  login(params: LoginParams): Promise<LoginResponse>;

  /**
   * Register a new user
   * @throws {GrowiApiError} when registration fails (e.g., username taken) or other API errors occur
   */
  register(params: RegisterParams): Promise<RegisterResponse>;

  /**
   * Logout current user
   * @throws {GrowiApiError} when logout fails or other API errors occur
   */
  logout(): Promise<void>;

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
 */
class UserService extends BaseService implements IUserService {
  async login(params: LoginParams): Promise<LoginResponse> {
    try {
      const response = await this.apiV1
        .post('login', {
          json: {
            loginForm: {
              username: params.username,
              password: params.password,
            },
          },
        })
        .json<LoginResponse>();

      if (!response.user) {
        throw new GrowiApiError('Login failed', 401);
      }

      return response;
    } catch (error) {
      if (error instanceof GrowiApiError) {
        throw error;
      }
      throw new GrowiApiError('Login failed', 401, error);
    }
  }

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
  async logout(): Promise<void> {
    try {
      await this.apiV3.get('logout');
    } catch (error) {
      if (error instanceof GrowiApiError) {
        throw error;
      }
      throw new GrowiApiError('Logout failed', 500, error);
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
