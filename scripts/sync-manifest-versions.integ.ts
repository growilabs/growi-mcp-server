import { spawn } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * The CLI layer is exercised as a real process: the exit code is the contract the PR check and the
 * release step rely on, and it cannot be observed by importing the module.
 */
const SCRIPT_NAME = 'sync-manifest-versions.ts';
const SCRIPT_SOURCE = fileURLToPath(new URL(`./${SCRIPT_NAME}`, import.meta.url));
const TSX_BIN = fileURLToPath(new URL('../node_modules/.bin/tsx', import.meta.url));

const PACKAGE_VERSION = '2.3.4';
const STALE_VERSION = '1.0.0';

type CliResult = {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
};

type ManifestVersions = {
  readonly geminiVersion: string;
  readonly geminiArgs: readonly string[];
  readonly pluginVersion: string;
};

const buildGeminiManifest = (version: string): unknown => ({
  name: 'growi-mcp-server',
  version,
  description: 'MCP server that connects AI models to GROWI wiki content.',
  settings: [{ name: 'App Name', description: 'Name identifier for the GROWI app', envVar: 'GROWI_APP_NAME_1' }],
  mcpServers: {
    growi: { command: 'npx', args: ['-y', `@growi/mcp-server@${version}`] },
  },
});

const buildPluginManifest = (version: string): unknown => ({
  name: 'mcp-client-skills',
  description: 'Skills for MCP clients to interact with GROWI.',
  version,
  author: { name: 'GROWI Labs' },
});

const writeJson = async (file: string, value: unknown): Promise<void> => {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const readManifestVersions = async (root: string): Promise<ManifestVersions> => {
  const gemini: unknown = JSON.parse(await readFile(join(root, 'gemini-extension.json'), 'utf8'));
  const plugin: unknown = JSON.parse(await readFile(join(root, '.claude-plugin', 'plugin.json'), 'utf8'));
  const geminiRecord = gemini as { readonly version: string; readonly mcpServers: Record<string, { readonly args: readonly string[] }> };
  const pluginRecord = plugin as { readonly version: string };

  return {
    geminiVersion: geminiRecord.version,
    geminiArgs: geminiRecord.mcpServers.growi.args,
    pluginVersion: pluginRecord.version,
  };
};

const runScript = (root: string, args: readonly string[]): Promise<CliResult> =>
  new Promise((resolve, reject) => {
    const child = spawn(TSX_BIN, [join(root, 'scripts', SCRIPT_NAME), ...args], { cwd: root });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ exitCode: code ?? -1, stdout, stderr });
    });
  });

describe('sync-manifest-versions CLI', () => {
  let root = '';

  const prepare = async (geminiVersion: string, pluginVersion: string): Promise<void> => {
    // "type": "module" mirrors the real package manifest; without it the script is loaded as CommonJS and its top-level await fails.
    await writeJson(join(root, 'package.json'), { name: '@growi/mcp-server', version: PACKAGE_VERSION, type: 'module' });
    await writeJson(join(root, 'gemini-extension.json'), buildGeminiManifest(geminiVersion));
    await writeJson(join(root, '.claude-plugin', 'plugin.json'), buildPluginManifest(pluginVersion));
  };

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'sync-manifest-versions-'));
    await mkdir(join(root, 'scripts'), { recursive: true });
    await mkdir(join(root, '.claude-plugin'), { recursive: true });
    await copyFile(SCRIPT_SOURCE, join(root, 'scripts', SCRIPT_NAME));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('succeeds without writing when the check finds every manifest in sync', async () => {
    await prepare(PACKAGE_VERSION, PACKAGE_VERSION);

    const result = await runScript(root, ['--check']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(PACKAGE_VERSION);
    expect(await readManifestVersions(root)).toEqual({
      geminiVersion: PACKAGE_VERSION,
      geminiArgs: ['-y', `@growi/mcp-server@${PACKAGE_VERSION}`],
      pluginVersion: PACKAGE_VERSION,
    });
  });

  it('fails without writing when the check finds a mismatch', async () => {
    await prepare(STALE_VERSION, STALE_VERSION);

    const result = await runScript(root, ['--check']);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('gemini-extension.json');
    expect(result.stderr).toContain('.claude-plugin/plugin.json');
    expect(await readManifestVersions(root)).toEqual({
      geminiVersion: STALE_VERSION,
      geminiArgs: ['-y', `@growi/mcp-server@${STALE_VERSION}`],
      pluginVersion: STALE_VERSION,
    });
  });

  it('still fails the check when it is started through a symlinked path', async () => {
    await prepare(STALE_VERSION, STALE_VERSION);
    const link = `${root}-link`;
    await symlink(root, link, 'dir');

    try {
      const result = await runScript(link, ['--check']);

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('gemini-extension.json');
    } finally {
      await rm(link, { force: true });
    }
  });

  it('rewrites both manifests when it is called without an argument', async () => {
    await prepare(STALE_VERSION, STALE_VERSION);

    const result = await runScript(root, []);

    expect(result.exitCode).toBe(0);
    expect(await readManifestVersions(root)).toEqual({
      geminiVersion: PACKAGE_VERSION,
      geminiArgs: ['-y', `@growi/mcp-server@${PACKAGE_VERSION}`],
      pluginVersion: PACKAGE_VERSION,
    });
  });

  it('rewrites both manifests when it is called with --write', async () => {
    await prepare(STALE_VERSION, STALE_VERSION);

    const result = await runScript(root, ['--write']);

    expect(result.exitCode).toBe(0);
    expect(await readManifestVersions(root)).toEqual({
      geminiVersion: PACKAGE_VERSION,
      geminiArgs: ['-y', `@growi/mcp-server@${PACKAGE_VERSION}`],
      pluginVersion: PACKAGE_VERSION,
    });
  });

  it.each([
    { label: 'a single dash', args: ['-check'] },
    { label: 'a value appended to the flag', args: ['--check=true'] },
    { label: 'an unknown flag', args: ['--dry-run'] },
    { label: 'the flag name without dashes', args: ['check'] },
    { label: 'both modes at once', args: ['--check', '--write'] },
  ])('refuses to run and writes nothing when the argument is $label', async ({ args }) => {
    await prepare(STALE_VERSION, STALE_VERSION);

    const result = await runScript(root, args);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('--check');
    expect(await readManifestVersions(root)).toEqual({
      geminiVersion: STALE_VERSION,
      geminiArgs: ['-y', `@growi/mcp-server@${STALE_VERSION}`],
      pluginVersion: STALE_VERSION,
    });
  });
});
