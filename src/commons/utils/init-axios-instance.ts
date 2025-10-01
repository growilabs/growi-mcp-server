import { axiosInstanceManager } from '@growi/sdk-typescript';
import type { GrowiAppConfig } from '../../config/types';

export const initAxiosInstance = async (apps: Map<string, GrowiAppConfig>): Promise<void> => {
  Array.from(apps.values()).map((app) => {
    axiosInstanceManager.addAxiosInstance({
      appName: app.name,
      baseURL: app.baseUrl,
      token: app.apiToken,
    });
  });
};
