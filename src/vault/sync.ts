import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { VaultAccess } from '../commons/utils/resolve-vault-access.js';

/**
 * How many pages the filesystem may refuse before the clone counts as unusable rather than merely
 * incomplete. A handful of over-long page names is the benign case (growilabs/growi#11596); a wider
 * failure means the update itself went wrong and must not be reported as success.
 */
const MAX_TOLERATED_MISSING_PAGES = 10;

/** Minimum git that understands the GIT_CONFIG_* environment variables. */
const MIN_GIT_VERSION = { major: 2, minor: 31 };

const HTTP_HINT = '(HTTP 401 = bad token, 404 = Vault disabled, 503 = bootstrap not finished)';

export type SyncAction = 'cloned' | 'refreshed';

export interface SyncVaultOptions {
  access: VaultAccess;
  /** Where the clone lives. */
  dest: string;
  /**
   * Leave everyone's personal `user/` space out of the working tree. Takes effect on the first
   * clone only — an existing clone keeps its layout.
   */
  noUser?: boolean;
}

export interface SyncVaultResult {
  action: SyncAction;
  dest: string;
  /** Tracked pages the filesystem refused to hold. They exist in the wiki but not on disk. */
  missingPaths: string[];
}

/**
 * A failure the caller should report and stop on. `exitCode` follows the CLI contract:
 * 1 for a usage or environment problem, 2 for a git failure or an unusable clone.
 */
export class VaultSyncError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode: number) {
    super(message);
    this.name = 'VaultSyncError';
    this.exitCode = exitCode;
  }
}

interface GitResult {
  status: number;
  stdout: string;
  stderr: string;
}

/**
 * Build the environment git runs in.
 *
 * The credential goes in `http.extraHeader` through `GIT_CONFIG_*` rather than on the command line
 * or in `.git/config`, so it appears in neither `ps` output, shell history, nor the repository.
 */
const buildGitEnv = (extraHeaders: string[]): NodeJS.ProcessEnv => {
  const entries: [string, string][] = [
    ...extraHeaders.map((value): [string, string] => ['http.extraHeader', value]),
    // Lifts Git for Windows' 260-character path limit; other platforms ignore the unknown key.
    ['core.longpaths', 'true'],
    // An empty value resets the helper list. Without this a 401 still hands the request to whatever
    // credential helper the machine has configured, which can open a GUI dialog and block until
    // someone dismisses it. GIT_TERMINAL_PROMPT=0 only suppresses git's own terminal prompt.
    ['credential.helper', ''],
  ];

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_CONFIG_COUNT: String(entries.length),
    GIT_TERMINAL_PROMPT: '0',
  };
  entries.forEach(([key, value], index) => {
    env[`GIT_CONFIG_KEY_${index}`] = key;
    env[`GIT_CONFIG_VALUE_${index}`] = value;
  });
  return env;
};

/**
 * Run git without a shell, so no argument needs quoting and Git Bash's MSYS runtime cannot rewrite
 * a pattern like `!/user` into a Windows path on the way in.
 */
const runGit = (args: string[], env: NodeJS.ProcessEnv, input?: string): GitResult => {
  const result = spawnSync('git', args, { env, input, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error != null) {
    throw new VaultSyncError(`could not run git (${result.error.message}) -- git must be installed and on PATH`, 1);
  }
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: (result.stderr ?? '').trim(),
  };
};

/**
 * Split a NUL-separated git listing into paths.
 *
 * The `-z` form is what keeps page names intact: without it git escapes anything non-ASCII into
 * octal (`\343\201\202`), which would turn a Japanese page name reported back to the user into
 * gibberish, and a name containing a newline would be counted as two entries.
 */
const toPaths = (output: string): string[] => output.split('\0').filter((entry) => entry !== '');

const assertGitVersion = (env: NodeJS.ProcessEnv): void => {
  const { status, stdout } = runGit(['version'], env);
  const version = stdout.trim();
  if (status !== 0) {
    throw new VaultSyncError('could not run git -- git must be installed and on PATH', 1);
  }

  const matched = /^git version (\d+)\.(\d+)/.exec(version);
  if (matched == null) {
    throw new VaultSyncError(`cannot read the git version from '${version}'`, 1);
  }
  const major = Number(matched[1]);
  const minor = Number(matched[2]);
  if (major < MIN_GIT_VERSION.major || (major === MIN_GIT_VERSION.major && minor < MIN_GIT_VERSION.minor)) {
    throw new VaultSyncError(`git >= ${MIN_GIT_VERSION.major}.${MIN_GIT_VERSION.minor} is required, found '${version}'`, 1);
  }
};

/**
 * Tracked paths that have no file in the working tree.
 *
 * Paths left out by sparse-checkout carry skip-worktree and are not reported here, so `--no-user`
 * does not look like a failed checkout.
 */
const listMissingPaths = (dest: string, env: NodeJS.ProcessEnv): string[] =>
  toPaths(runGit(['-C', dest, 'diff-index', '-z', '--diff-filter=D', '--name-only', 'HEAD'], env).stdout);

/**
 * Materialize the upstream tree, and decide honestly whether the result is usable.
 *
 * `git reset --hard` is all-or-nothing: if one page name exceeds what the filesystem can hold it
 * aborts without moving HEAD, which would leave every later refresh failing forever. The fallback
 * moves HEAD and the index with no file I/O, drops files that vanished upstream, then writes out
 * every file the filesystem does accept.
 *
 * What must not happen is reporting success when the checkout failed for some other reason (an
 * object that cannot be fetched, a full disk, a permission error), because the caller reads a clean
 * return as "the clone is usable". Rather than guess from git's error text -- which is localized, so
 * matching on it is unreliable -- count the tracked files still absent from the working tree.
 * @returns The paths that could not be written, empty when everything was materialized
 */
const resetToUpstream = (dest: string, env: NodeJS.ProcessEnv): string[] => {
  const hardReset = runGit(['-C', dest, 'reset', '--hard', '@{u}'], env);
  if (hardReset.status === 0) {
    return [];
  }

  const indexOnlyReset = runGit(['-C', dest, 'reset', '--quiet', '@{u}'], env);
  if (indexOnlyReset.status !== 0) {
    throw new VaultSyncError(`git could not move '${dest}' to the upstream revision: ${indexOnlyReset.stderr || hardReset.stderr}`, 2);
  }
  runGit(['-C', dest, 'clean', '-qfd'], env);
  const checkout = runGit(['-C', dest, 'checkout-index', '-qaf'], env);

  const missingPaths = listMissingPaths(dest, env);
  if (missingPaths.length === 0) {
    return [];
  }

  const trackedCount = toPaths(runGit(['-C', dest, 'ls-files', '-z'], env).stdout).length;
  if (missingPaths.length <= MAX_TOLERATED_MISSING_PAGES && missingPaths.length < trackedCount) {
    return missingPaths;
  }

  throw new VaultSyncError(
    `only ${trackedCount - missingPaths.length} of ${trackedCount} pages could be written to '${dest}', so the clone is not usable: ${checkout.stderr || hardReset.stderr}`,
    2,
  );
};

const cloneVault = (access: VaultAccess, dest: string, noUser: boolean, env: NodeJS.ProcessEnv): void => {
  if (fs.existsSync(dest) && fs.readdirSync(dest).length > 0) {
    throw new VaultSyncError(`'${dest}' already exists, is not empty, and is not a Vault clone -- remove it or pass another directory`, 1);
  }

  // No --filter=blob:none: the Vault endpoint does not advertise the filter capability, so git would
  // drop the filter and transfer everything anyway, while still marking the clone a promisor repo.
  // The Vault refuses fetches of objects it did not advertise (uploadpack.allowAnySHA1InWant=false),
  // so any later lazy blob fetch would then fail. Tracked upstream as growilabs/growi#11595.
  const cloned = runGit(['clone', '--quiet', '--no-checkout', access.remoteUrl, dest], env);
  if (cloned.status !== 0) {
    throw new VaultSyncError(`git could not clone ${access.remoteUrl} ${HTTP_HINT}: ${cloned.stderr}`, 2);
  }

  if (noUser) {
    // Patterns go in on stdin so nothing has to survive argument handling on the way to git.
    const sparse = runGit(['-C', dest, 'sparse-checkout', 'set', '--no-cone', '--stdin'], env, '/*\n!/user\n');
    if (sparse.status !== 0) {
      throw new VaultSyncError(`git could not exclude the personal user space (git >= 2.35 is required for this option): ${sparse.stderr}`, 2);
    }
  }
};

const refreshVault = (access: VaultAccess, dest: string, env: NodeJS.ProcessEnv): void => {
  const origin = runGit(['-C', dest, 'remote', 'get-url', 'origin'], env);
  const originUrl = origin.status === 0 ? origin.stdout.trim() : '';
  if (originUrl !== access.remoteUrl) {
    throw new VaultSyncError(`'${dest}' is a clone of '${originUrl}', not of '${access.remoteUrl}' -- wrong instance or wrong directory`, 1);
  }

  const fetched = runGit(['-C', dest, 'fetch', '--quiet'], env);
  if (fetched.status !== 0) {
    throw new VaultSyncError(`git could not fetch from ${access.remoteUrl} ${HTTP_HINT}: ${fetched.stderr}`, 2);
  }
};

/**
 * Clone the Vault on first use, refresh it afterwards, and report what happened.
 *
 * Deciding clone-vs-refresh here — rather than leaving it to whoever calls the command — is what
 * makes repeated runs safe: `git clone` fails on an existing directory, and re-deriving the steps
 * each time is where mistakes get in.
 * @returns Which action ran, where the clone is, and any pages that could not be written
 * @throws VaultSyncError when the clone cannot be made usable
 */
export const syncVault = ({ access, dest, noUser = false }: SyncVaultOptions): SyncVaultResult => {
  const env = buildGitEnv(access.extraHeaders);
  assertGitVersion(env);

  const isExistingClone = fs.existsSync(path.join(dest, '.git'));
  if (isExistingClone) {
    refreshVault(access, dest, env);
  } else {
    cloneVault(access, dest, noUser, env);
  }

  return {
    action: isExistingClone ? 'refreshed' : 'cloned',
    dest,
    missingPaths: resetToUpstream(dest, env),
  };
};
