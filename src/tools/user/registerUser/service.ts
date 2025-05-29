import { apiV3 } from '../../../commons/api/client-v3.js';
import { GrowiApiError, isGrowiApiError } from '../../../commons/api/growi-api-error.js';
import type { RegisterUserSchema } from './schema.js';

export async function registerUser(params: RegisterUserSchema): Promise<unknown> {
  try {
    const response = await apiV3
      .post('users', {
        json: params,
      })
      .json();
    return response;
  } catch (error) {
    if (isGrowiApiError(error)) {
      // Enhance the GrowiApiError with more context
      throw new GrowiApiError('Failed to register user', error.statusCode, error.details);
    }
    // Handle other errors by wrapping them in GrowiApiError
    throw new GrowiApiError('Failed to register user', 500, { cause: error instanceof Error ? error.message : 'Unknown error' });
  }
}
