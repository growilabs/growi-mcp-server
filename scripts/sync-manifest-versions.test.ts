import { describe, expect, it } from 'vitest';
import {
  type ClaudePluginManifest,
  type GeminiExtensionManifest,
  applyVersionToGeminiManifest,
  applyVersionToPluginManifest,
  collectVersionViolations,
  extractPackageVersion,
} from './sync-manifest-versions.js';

const buildGeminiManifest = (overrides: { readonly version?: string; readonly args?: readonly string[] } = {}): GeminiExtensionManifest => ({
  name: 'growi-mcp-server',
  version: overrides.version ?? '1.0.0',
  description: 'MCP server that connects AI models to GROWI wiki content.',
  settings: [{ name: 'App Name', description: 'Name identifier for the GROWI app', envVar: 'GROWI_APP_NAME_1' }],
  mcpServers: {
    growi: {
      command: 'npx',
      args: overrides.args ?? ['-y', '@growi/mcp-server@1.0.0'],
    },
  },
});

const buildPluginManifest = (version = '1.0.0'): ClaudePluginManifest => ({
  name: 'mcp-client-skills',
  description: 'Skills for MCP clients to interact with GROWI.',
  version,
  author: { name: 'GROWI Labs' },
});

describe('applyVersionToGeminiManifest', () => {
  it('moves the displayed version and the launch argument pin to the same version', () => {
    const result = applyVersionToGeminiManifest(buildGeminiManifest(), '2.3.4');

    expect(result.version).toBe('2.3.4');
    expect(result.mcpServers.growi.args).toContain('@growi/mcp-server@2.3.4');
  });

  it('pins a launch argument that carries no version yet', () => {
    const result = applyVersionToGeminiManifest(buildGeminiManifest({ args: ['-y', '@growi/mcp-server'] }), '2.3.4');

    expect(result.mcpServers.growi.args).toEqual(['-y', '@growi/mcp-server@2.3.4']);
  });

  it('leaves the other launch arguments, their order, and the other manifest keys untouched', () => {
    const manifest = buildGeminiManifest();
    const result = applyVersionToGeminiManifest(manifest, '2.3.4');

    expect(result.mcpServers.growi.args).toEqual(['-y', '@growi/mcp-server@2.3.4']);
    expect(result.mcpServers.growi.command).toBe('npx');
    expect(result.name).toBe(manifest.name);
    expect(result.description).toBe(manifest.description);
    expect(result.settings).toEqual(manifest.settings);
  });

  it('keeps other mcpServers entries and their arguments as they are', () => {
    const manifest: GeminiExtensionManifest = {
      ...buildGeminiManifest(),
      mcpServers: {
        growi: { command: 'npx', args: ['-y', '@growi/mcp-server@1.0.0'] },
        other: { command: 'uvx', args: ['some-other-server@0.1.0'] },
      },
    };

    const result = applyVersionToGeminiManifest(manifest, '2.3.4');

    expect(result.mcpServers.other).toEqual({ command: 'uvx', args: ['some-other-server@0.1.0'] });
  });

  it('does not mutate the given manifest', () => {
    const manifest = buildGeminiManifest();
    applyVersionToGeminiManifest(manifest, '2.3.4');

    expect(manifest.version).toBe('1.0.0');
    expect(manifest.mcpServers.growi.args).toEqual(['-y', '@growi/mcp-server@1.0.0']);
  });
});

describe('applyVersionToPluginManifest', () => {
  it('updates the version and leaves the other keys untouched', () => {
    const manifest = buildPluginManifest();
    const result = applyVersionToPluginManifest(manifest, '2.3.4');

    expect(result).toEqual({ ...manifest, version: '2.3.4' });
  });

  it('does not mutate the given manifest', () => {
    const manifest = buildPluginManifest();
    applyVersionToPluginManifest(manifest, '2.3.4');

    expect(manifest.version).toBe('1.0.0');
  });
});

describe('collectVersionViolations', () => {
  it('reports nothing when every manifest already carries the package version', () => {
    const violations = collectVersionViolations(
      { gemini: buildGeminiManifest({ version: '2.3.4', args: ['-y', '@growi/mcp-server@2.3.4'] }), plugin: buildPluginManifest('2.3.4') },
      '2.3.4',
    );

    expect(violations).toEqual([]);
  });

  it('reports the file, the place, the found value and the expected value for a stale displayed version', () => {
    const violations = collectVersionViolations(
      { gemini: buildGeminiManifest({ version: '1.0.0', args: ['-y', '@growi/mcp-server@2.3.4'] }), plugin: buildPluginManifest('2.3.4') },
      '2.3.4',
    );

    expect(violations).toEqual([{ file: 'gemini-extension.json', location: 'version', found: '1.0.0', expected: '2.3.4' }]);
  });

  it('reports the launch argument position when the pinned version is stale', () => {
    const violations = collectVersionViolations(
      { gemini: buildGeminiManifest({ version: '2.3.4', args: ['-y', '@growi/mcp-server@1.0.0'] }), plugin: buildPluginManifest('2.3.4') },
      '2.3.4',
    );

    expect(violations).toEqual([
      { file: 'gemini-extension.json', location: 'mcpServers.growi.args[1]', found: '@growi/mcp-server@1.0.0', expected: '@growi/mcp-server@2.3.4' },
    ]);
  });

  it('reports a launch argument that carries no version yet, so the check and the rewrite agree', () => {
    const violations = collectVersionViolations(
      { gemini: buildGeminiManifest({ version: '2.3.4', args: ['-y', '@growi/mcp-server'] }), plugin: buildPluginManifest('2.3.4') },
      '2.3.4',
    );

    expect(violations).toEqual([
      { file: 'gemini-extension.json', location: 'mcpServers.growi.args[1]', found: '@growi/mcp-server', expected: '@growi/mcp-server@2.3.4' },
    ]);
  });

  it('reports a stale plugin manifest version', () => {
    const violations = collectVersionViolations(
      { gemini: buildGeminiManifest({ version: '2.3.4', args: ['-y', '@growi/mcp-server@2.3.4'] }), plugin: buildPluginManifest('1.0.0') },
      '2.3.4',
    );

    expect(violations).toEqual([{ file: '.claude-plugin/plugin.json', location: 'version', found: '1.0.0', expected: '2.3.4' }]);
  });

  it('reports every mismatch at once so a single run shows all the work to do', () => {
    const violations = collectVersionViolations({ gemini: buildGeminiManifest(), plugin: buildPluginManifest() }, '2.3.4');

    expect(violations).toEqual([
      { file: 'gemini-extension.json', location: 'version', found: '1.0.0', expected: '2.3.4' },
      { file: 'gemini-extension.json', location: 'mcpServers.growi.args[1]', found: '@growi/mcp-server@1.0.0', expected: '@growi/mcp-server@2.3.4' },
      { file: '.claude-plugin/plugin.json', location: 'version', found: '1.0.0', expected: '2.3.4' },
    ]);
  });
});

describe('extractPackageVersion', () => {
  it('returns the version of the single source of truth', () => {
    expect(extractPackageVersion({ version: '2.3.4' })).toBe('2.3.4');
  });

  it.each([
    ['missing', {}],
    ['empty', { version: '' }],
    ['blank', { version: '   ' }],
    ['not a string', { version: 234 }],
  ])('fails instead of falling back to a default when the version is %s', (_label, packageManifest) => {
    expect(() => extractPackageVersion(packageManifest)).toThrow(/version/);
  });
});
