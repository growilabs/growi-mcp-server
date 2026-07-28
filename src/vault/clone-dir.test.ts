import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveCloneDir } from './clone-dir.js';

describe('resolveCloneDir', () => {
  beforeEach(() => {
    vi.stubEnv('XDG_CACHE_HOME', '/cache');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('places the clone under the cache root, keyed by the instance host', () => {
    expect(resolveCloneDir('https://wiki.example.com')).toBe(path.join('/cache', 'growi-vault', 'wiki.example.com'));
  });

  it('gives two different instances two different directories', () => {
    expect(resolveCloneDir('https://wiki.example.com')).not.toBe(resolveCloneDir('https://staging.example.com'));
  });

  it('resolves the same directory whether or not the base URL ends with a slash', () => {
    expect(resolveCloneDir('https://wiki.example.com/')).toBe(resolveCloneDir('https://wiki.example.com'));
  });

  it('ignores the scheme, so http and https of one host share a clone', () => {
    expect(resolveCloneDir('http://wiki.example.com')).toBe(resolveCloneDir('https://wiki.example.com'));
  });

  it('keeps a sub-path and a port distinguishable without leaving path separators in the name', () => {
    const withSubPath = resolveCloneDir('https://example.com/wiki');
    const withPort = resolveCloneDir('https://example.com:8080');

    expect(path.basename(withSubPath)).toBe('example.com-wiki');
    expect(path.basename(withPort)).toBe('example.com-8080');
  });

  it('falls back to the home cache directory when XDG_CACHE_HOME is unset', () => {
    vi.stubEnv('XDG_CACHE_HOME', undefined);

    expect(resolveCloneDir('https://wiki.example.com')).toBe(path.join(os.homedir(), '.cache', 'growi-vault', 'wiki.example.com'));
  });
});
