import os from 'node:os';
import path from 'node:path';

/**
 * The directory a Vault clone lives in, derived from the instance's base URL.
 *
 * The location is computed rather than chosen by the caller because that is what makes the clone
 * *reusable*: a freshly picked directory each session would re-download the whole wiki every time.
 * Deriving it from the base URL rather than from the app name also means renaming or repointing an
 * app cannot silently make one clone stand in for a different wiki.
 * @param baseUrl - Base URL of the GROWI instance
 * @returns Absolute path of the clone directory for that instance
 */
export const resolveCloneDir = (baseUrl: string): string => {
  const withoutScheme = baseUrl.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '').replace(/\/+$/, '');
  const slug = withoutScheme.replace(/[^A-Za-z0-9._-]/g, '-');
  const cacheRoot = process.env.XDG_CACHE_HOME != null && process.env.XDG_CACHE_HOME !== '' ? process.env.XDG_CACHE_HOME : path.join(os.homedir(), '.cache');
  return path.join(cacheRoot, 'growi-vault', slug);
};
