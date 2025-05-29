import { apiV3 } from '../../../commons/api/client-v3.js';
import { isGrowiApiError } from '../../../commons/api/growi-api-error.js';
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
      throw error; // GrowiApiErrorをそのままスロー
    }
    // その他のエラーの場合は、より詳細な情報を含めてスロー
    if (error instanceof Error) {
      throw new Error('Registration failed. Please try again later.', { cause: error });
    }
    throw new Error('An unknown error occurred during registration.');
  }
}
