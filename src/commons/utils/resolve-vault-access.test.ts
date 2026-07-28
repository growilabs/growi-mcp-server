import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VaultAccess } from './resolve-vault-access.js';

// Mock dotenv-flow so the tests drive configuration purely through process.env
vi.mock('dotenv-flow', () => ({
  default: {
    config: vi.fn(),
  },
}));

// The observable contract is what git ends up being told: which URL to clone and which headers
// carry the credential. Tests therefore assert on the resolved endpoint and header values a server
// would receive, not on how the configuration was read.
const resolveWithEnv = async (env: NodeJS.ProcessEnv, appName?: string): Promise<VaultAccess> => {
  process.env = env;
  const { resolveVaultAccess } = await import('./resolve-vault-access.js');
  return resolveVaultAccess(appName);
};

const singleApp = {
  GROWI_APP_NAME_1: 'main',
  GROWI_BASE_URL_1: 'https://wiki.example.com',
  GROWI_API_TOKEN_1: 'token-main',
};

describe('resolveVaultAccess', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('points at the /vault.git endpoint of the app base URL', async () => {
    const access = await resolveWithEnv({ ...singleApp });

    expect(access.appName).toBe('main');
    expect(access.remoteUrl).toBe('https://wiki.example.com/vault.git');
  });

  it('does not double the separator when the base URL ends with a slash', async () => {
    const access = await resolveWithEnv({ ...singleApp, GROWI_BASE_URL_1: 'https://wiki.example.com/' });

    expect(access.remoteUrl).toBe('https://wiki.example.com/vault.git');
  });

  it('sends the API token as a Bearer credential when no HTTP auth is configured', async () => {
    const access = await resolveWithEnv({ ...singleApp });

    expect(access.extraHeaders).toEqual(['Authorization: Bearer token-main']);
  });

  it('gives the Authorization header to the proxy and moves the API token aside when HTTP auth is configured', async () => {
    const access = await resolveWithEnv({
      ...singleApp,
      GROWI_HTTP_AUTH_USERNAME_1: 'proxy-user',
      GROWI_HTTP_AUTH_PASSWORD_1: 'proxy-pass',
    });

    const authorization = access.extraHeaders.find((header) => header.startsWith('Authorization: '));
    expect(authorization).toBeDefined();
    // The proxy credential, not the GROWI token, owns the Authorization header.
    const encoded = (authorization as string).slice('Authorization: Basic '.length);
    expect(Buffer.from(encoded, 'base64').toString('utf8')).toBe('proxy-user:proxy-pass');
    expect(access.extraHeaders).toContain('X-GROWI-ACCESS-TOKEN: token-main');
    // A Bearer header here would send the API token where the proxy expects its own credential.
    expect(access.extraHeaders.some((header) => header.includes('Bearer'))).toBe(false);
  });

  it('resolves the requested app when several are configured', async () => {
    const access = await resolveWithEnv(
      {
        ...singleApp,
        GROWI_APP_NAME_2: 'staging',
        GROWI_BASE_URL_2: 'https://staging.example.com',
        GROWI_API_TOKEN_2: 'token-staging',
      },
      'staging',
    );

    expect(access.appName).toBe('staging');
    expect(access.remoteUrl).toBe('https://staging.example.com/vault.git');
    expect(access.extraHeaders).toEqual(['Authorization: Bearer token-staging']);
  });

  it('falls back to the default app when no app name is given', async () => {
    const access = await resolveWithEnv({
      ...singleApp,
      GROWI_DEFAULT_APP_NAME: 'staging',
      GROWI_APP_NAME_2: 'staging',
      GROWI_BASE_URL_2: 'https://staging.example.com',
      GROWI_API_TOKEN_2: 'token-staging',
    });

    expect(access.appName).toBe('staging');
  });

  it('rejects an app name that is not configured', async () => {
    await expect(resolveWithEnv({ ...singleApp }, 'nope')).rejects.toThrow('"nope" is not configured');
  });
});
