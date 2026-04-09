import { axiosInstanceManager } from '@growi/sdk-typescript';
import { GrowiApiError } from '../../../commons/api/growi-api-error.js';

export type SuggestPathParam = {
  body: string;
};

export type PathSuggestion = {
  type: string;
  path: string;
  label: string;
  description: string;
  grant: number;
};

export type SuggestPathResponse = {
  suggestions: PathSuggestion[];
};

export const suggestPath = async (params: SuggestPathParam, appName: string): Promise<SuggestPathResponse> => {
  try {
    const instance = axiosInstanceManager.getAxiosInstance(appName);
    const baseURL = instance.defaults.baseURL ?? '';

    const response = await instance.post<SuggestPathResponse>(
      `${baseURL}/_api/v3/ai-tools/suggest-path`,
      { body: params.body },
    );

    if (!response.data?.suggestions) {
      throw new GrowiApiError('Invalid response received from suggest-path API', 500, { response: response.data });
    }

    return response.data;
  } catch (error) {
    if (error instanceof GrowiApiError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    const statusCode = error instanceof Error && 'response' in error
      ? (error as { response?: { status?: number } }).response?.status || 500
      : 500;

    throw new GrowiApiError(`Failed to get path suggestions: ${message}`, statusCode, { originalError: error });
  }
};
