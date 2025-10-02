import config from '../../config/default.js';

/**
 * Resolves the app name based on the provided input.
 * If appName is undefined, returns the default app name.
 * If appName is provided, validates it exists in the apps map and returns it.
 * @param appName - Optional app name to resolve
 * @returns The resolved app name
 * @throws Error if the provided appName does not exist in the apps configuration
 */
export const resolveAppName = (appName?: string): string => {
  if (appName == null) {
    return config.growi.defaultAppName;
  }

  if (!config.growi.apps.has(appName)) {
    throw new Error(`App name "${appName}" is not configured`);
  }

  return appName;
};
