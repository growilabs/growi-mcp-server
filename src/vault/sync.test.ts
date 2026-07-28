import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { VaultAccess } from '../commons/utils/resolve-vault-access.js';
import { VaultSyncError, syncVault } from './sync.js';

// These tests drive the real git binary against a local repository standing in for a Vault, because
// the contract under test is "after this call, is the wiki on disk and is the result honest about
// it" -- something only a real clone can answer. No network and no credential are involved: a
// file:// remote needs no auth, which is also why extraHeaders is empty here.

const git = (args: string[], cwd: string, input?: string): string =>
  execFileSync('git', ['-c', 'user.email=test@example.com', '-c', 'user.name=test', ...args], {
    cwd,
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

/** A page name long enough that the filesystem cannot hold it (growilabs/growi#11596). */
const unwritableName = (index: number): string => `${'あ'.repeat(90)}-${index}.md`;

let workspace: string;
let upstream: string;
let origin: string;

const writePage = (relativePath: string, body: string): void => {
  const absolute = path.join(upstream, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, body);
};

/** Commit a page whose name the filesystem would reject, via the index so no file is ever created. */
const stageUnwritablePage = (name: string): void => {
  const blob = git(['hash-object', '-w', '--stdin'], upstream, `body of ${name}`).trim();
  git(['update-index', '--add', '--cacheinfo', `100644,${blob},${name}`], upstream);
};

const commitAll = (message: string): void => {
  git(['add', '-A'], upstream);
  git(['commit', '--quiet', '--allow-empty', '-m', message], upstream);
  git(['push', '--quiet', 'origin', 'HEAD:refs/heads/main'], upstream);
};

const accessFor = (remoteUrl: string): VaultAccess => ({
  appName: 'test',
  baseUrl: 'https://wiki.example.com',
  remoteUrl,
  extraHeaders: [],
});

beforeEach(() => {
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-sync-test-'));
  origin = path.join(workspace, 'vault.git');
  upstream = path.join(workspace, 'upstream');

  git(['init', '--quiet', '--bare', '--initial-branch=main', origin], workspace);
  fs.mkdirSync(upstream);
  git(['init', '--quiet', '--initial-branch=main'], upstream);
  git(['remote', 'add', 'origin', `file://${origin}`], upstream);

  writePage('Tips/SAML.md', 'keycloak setup');
  writePage('Tips/LDAP.md', 'ldap setup');
  writePage('旧%3A note.md', 'a page whose name is percent-encoded on disk');
  commitAll('initial pages');
});

afterEach(() => {
  fs.rmSync(workspace, { recursive: true, force: true });
});

describe('syncVault', () => {
  it('brings the wiki onto disk on the first run', () => {
    const dest = path.join(workspace, 'clone');

    const result = syncVault({ access: accessFor(`file://${origin}`), dest });

    expect(result.action).toBe('cloned');
    expect(result.missingPaths).toEqual([]);
    expect(fs.readFileSync(path.join(dest, 'Tips/SAML.md'), 'utf8')).toBe('keycloak setup');
    // The on-disk name stays percent-encoded; decoding it is the caller's job.
    expect(fs.existsSync(path.join(dest, '旧%3A note.md'))).toBe(true);
  });

  it('brings a later run up to date, including pages removed upstream', () => {
    const dest = path.join(workspace, 'clone');
    syncVault({ access: accessFor(`file://${origin}`), dest });

    writePage('Tips/OIDC.md', 'oidc setup');
    fs.rmSync(path.join(upstream, 'Tips/LDAP.md'));
    commitAll('add OIDC, drop LDAP');

    const result = syncVault({ access: accessFor(`file://${origin}`), dest });

    expect(result.action).toBe('refreshed');
    expect(fs.readFileSync(path.join(dest, 'Tips/OIDC.md'), 'utf8')).toBe('oidc setup');
    expect(fs.existsSync(path.join(dest, 'Tips/LDAP.md'))).toBe(false);
  });

  it('reuses the same directory instead of cloning again', () => {
    const dest = path.join(workspace, 'clone');
    syncVault({ access: accessFor(`file://${origin}`), dest });

    expect(syncVault({ access: accessFor(`file://${origin}`), dest }).action).toBe('refreshed');
  });

  it('refuses a directory that holds another instance to avoid grepping the wrong wiki', () => {
    const dest = path.join(workspace, 'clone');
    syncVault({ access: accessFor(`file://${origin}`), dest });

    const otherOrigin = path.join(workspace, 'other-vault.git');
    git(['init', '--quiet', '--bare', '--initial-branch=main', otherOrigin], workspace);

    try {
      syncVault({ access: accessFor(`file://${otherOrigin}`), dest });
      expect.unreachable('a clone of a different instance must not be accepted');
    } catch (error) {
      expect(error).toBeInstanceOf(VaultSyncError);
      expect((error as VaultSyncError).exitCode).toBe(1);
    }
  });

  it('refuses to clone over a directory that already holds something else', () => {
    const dest = path.join(workspace, 'occupied');
    fs.mkdirSync(dest);
    fs.writeFileSync(path.join(dest, 'keep-me.txt'), 'not a clone');

    try {
      syncVault({ access: accessFor(`file://${origin}`), dest });
      expect.unreachable('an occupied directory must not be clobbered');
    } catch (error) {
      expect((error as VaultSyncError).exitCode).toBe(1);
    }
    expect(fs.existsSync(path.join(dest, 'keep-me.txt'))).toBe(true);
  });

  it('reports a git failure rather than leaving an unusable clone behind', () => {
    try {
      syncVault({ access: accessFor(`file://${path.join(workspace, 'no-such-vault.git')}`), dest: path.join(workspace, 'clone') });
      expect.unreachable('cloning a remote that does not exist must fail');
    } catch (error) {
      expect(error).toBeInstanceOf(VaultSyncError);
      expect((error as VaultSyncError).exitCode).toBe(2);
    }
  });

  describe('when the filesystem cannot hold some page names', () => {
    it('keeps every other page and names the ones it could not write', () => {
      stageUnwritablePage(unwritableName(0));
      stageUnwritablePage(unwritableName(1));
      commitAll('add pages with names this filesystem cannot hold');
      const dest = path.join(workspace, 'clone');

      const result = syncVault({ access: accessFor(`file://${origin}`), dest });

      expect(result.missingPaths).toHaveLength(2);
      expect(result.missingPaths).toContain(unwritableName(0));
      // The point of the fallback: discovery still gets the rest of the wiki.
      expect(fs.readFileSync(path.join(dest, 'Tips/SAML.md'), 'utf8')).toBe('keycloak setup');
    });

    it('still refreshes afterwards instead of failing forever', () => {
      stageUnwritablePage(unwritableName(0));
      commitAll('add a page with a name this filesystem cannot hold');
      const dest = path.join(workspace, 'clone');
      syncVault({ access: accessFor(`file://${origin}`), dest });

      writePage('Tips/OIDC.md', 'oidc setup');
      commitAll('add OIDC');

      const result = syncVault({ access: accessFor(`file://${origin}`), dest });

      expect(result.action).toBe('refreshed');
      expect(result.missingPaths).toHaveLength(1);
      expect(fs.readFileSync(path.join(dest, 'Tips/OIDC.md'), 'utf8')).toBe('oidc setup');
    });

    it('fails when so much is missing that the clone cannot be trusted', () => {
      for (let index = 0; index < 11; index += 1) {
        stageUnwritablePage(unwritableName(index));
      }
      commitAll('add more unwritable pages than the fallback tolerates');

      try {
        syncVault({ access: accessFor(`file://${origin}`), dest: path.join(workspace, 'clone') });
        expect.unreachable('a clone this incomplete must not be reported as usable');
      } catch (error) {
        expect(error).toBeInstanceOf(VaultSyncError);
        expect((error as VaultSyncError).exitCode).toBe(2);
      }
    });
  });
});
