import { apiV3 } from '../../commons/api/client-v3.js';
import { isGrowiApiError } from '../../commons/api/growi-api-error.js';

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
