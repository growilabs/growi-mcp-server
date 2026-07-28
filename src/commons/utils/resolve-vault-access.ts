import config from '../../config/default.js';
import { buildBasicAuthHeader } from './build-basic-auth-header.js';
import { resolveAppName } from './resolve-app-name.js';

/**
 * Everything needed to talk to one GROWI instance's Vault git endpoint.
 */
export interface VaultAccess {
  /** The resolved app name, so callers can report which instance they actually used. */
  appName: string;
  baseUrl: string;
  /** The read-only git smart-http endpoint to clone from. */
  remoteUrl: string;
  /**
   * Values for git's `http.extraHeader`, in order. These carry the credential: pass them to git
   * through the environment and never write them to a log, a command line, or `.git/config`.
   */
  extraHeaders: string[];
}

/**
 * Resolve the Vault git endpoint and auth headers for a configured GROWI app.
 *
 * The header layout deliberately mirrors what `index.ts` hands the SDK: when HTTP auth guards the
 * instance the proxy credentials take the `Authorization` header and GROWI's own token moves to
 * `X-GROWI-ACCESS-TOKEN`, otherwise the token rides the default Bearer scheme. Resolving it here
 * is what keeps callers from re-reading `GROWI_*` environment variables and drifting out of sync
 * with the server's own configuration handling.
 * @param appName - Optional app name; falls back to the configured default app
 * @returns The endpoint and credential headers for that app
 * @throws Error if the app name is not configured
 */
export const resolveVaultAccess = (appName?: string): VaultAccess => {
  const resolvedAppName = resolveAppName(appName);
  const app = config.growi.apps.get(resolvedAppName);
  if (app == null) {
    throw new Error(`App name "${resolvedAppName}" is not configured`);
  }

  const baseUrl = app.baseUrl.replace(/\/+$/, '');
  const extraHeaders =
    app.httpAuth != null
      ? [`Authorization: ${buildBasicAuthHeader(app.httpAuth.username, app.httpAuth.password)}`, `X-GROWI-ACCESS-TOKEN: ${app.apiToken}`]
      : [`Authorization: Bearer ${app.apiToken}`];

  return {
    appName: resolvedAppName,
    baseUrl,
    remoteUrl: `${baseUrl}/vault.git`,
    extraHeaders,
  };
};
