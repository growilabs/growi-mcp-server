import { growiClientManager } from '../../commons/api/growi-client-manager.js';

export const setGrowiClient = async (appName?: string): Promise<void> => {
  const targetAppName = appName || growiClientManager.getDefaultAppName();
  await growiClientManager.setGlobalAxiosClient(targetAppName);
};
