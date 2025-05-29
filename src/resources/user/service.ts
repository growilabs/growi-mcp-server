import { apiV3 } from '../../commons/api/client-v3.js';
import { isGrowiApiError } from '../../commons/api/growi-api-error.js';
import type { GetUserPagesParams } from './types.js';

export async function getMe() {
  try {
    const response = await apiV3.get('users/me').json();
    return response;
  } catch (error) {
    if (isGrowiApiError(error)) {
      throw new Error(`Failed to get user info: [${error.statusCode}] ${error.message}`);
    }
    throw new Error('Failed to get user info. Please check if you are authenticated.');
  }
}

export async function getExternalAccounts(userId: string) {
  try {
    const response = await apiV3.get(`users/${userId}/external-accounts`).json();
    return response;
  } catch (error) {
    if (isGrowiApiError(error)) {
      throw new Error(`Failed to get external accounts: [${error.statusCode}] ${error.message}`);
    }
    throw new Error('Failed to get external accounts. Please try again later.');
  }
}

export async function getUserPages(params: GetUserPagesParams) {
  const { userId, limit, offset, sort, status } = params;
  try {
    const searchParams = new URLSearchParams();
    if (limit) searchParams.set('limit', limit.toString());
    if (offset) searchParams.set('offset', offset.toString());
    if (sort) searchParams.set('sort', sort);
    if (status) searchParams.set('status', status);

    const response = await apiV3
      .get(`users/${userId}/pages`, {
        searchParams,
      })
      .json();
    return response;
  } catch (error) {
    if (isGrowiApiError(error)) {
      if (error.statusCode === 404) {
        throw new Error('User not found');
      }
      if (error.statusCode === 403) {
        throw new Error('Access denied: You do not have permission to view these pages');
      }
      throw new Error(`Failed to get user pages: [${error.statusCode}] ${error.message}`);
    }
    throw new Error('Failed to get user pages. Please try again later.');
  }
}
