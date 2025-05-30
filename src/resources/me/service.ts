import { apiV3 } from '../../commons/api/client-v3.js';
import { GrowiApiError, isGrowiApiError } from '../../commons/api/growi-api-error.js';

export interface GetMeResponse {
  user: {
    _id: string;
    name: string;
    username: string;
    email: string;
    admin: boolean;
    imageUrlCached: string;
    isGravatarEnabled: boolean;
    isEmailPublished: boolean;
    lang: string;
    status: number;
    createdAt: string | Date;
    lastLoginAt?: string | Date;
    introduction: string;
    isQuestionnaireEnabled: boolean;
  };
}

export async function getMe(): Promise<GetMeResponse> {
  try {
    const response = await apiV3.get('users/me').json<GetMeResponse>();

    if (!response.user) {
      throw new GrowiApiError('Failed to get user info', 500);
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
        throw new GrowiApiError('Failed to get user info from GROWI', response.status, await response.json().catch(() => undefined));
      }
    }

    throw new GrowiApiError('Unknown error occurred', 500, error);
  }
}
