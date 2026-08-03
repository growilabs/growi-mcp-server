import { isDeepStrictEqual } from 'node:util';
import { describe, expect, it } from 'vitest';
import {
  type ClaudePluginManifest,
  type GeminiExtensionManifest,
  type McpServerEntry,
  applyVersionToGeminiManifest,
  applyVersionToPluginManifest,
  collectVersionViolations,
  extractPackageVersion,
} from './sync-manifest-versions.js';

/** Extra keys stand for the launch options a manifest may carry; the sync must not drop any of them. */
const buildServerEntry = (args?: readonly string[]): McpServerEntry => ({
  command: 'npx',
  ...(args === undefined ? {} : { args }),
  env: { GROWI_APP_NAME_1: 'main' },
  timeout: 30000,
  trust: false,
});

const buildGeminiManifest = (
  overrides: {
    readonly version?: string;
    readonly args?: readonly string[];
    readonly mcpServers?: Readonly<Record<string, McpServerEntry>>;
  } = {},
): GeminiExtensionManifest => ({
  name: 'growi-mcp-server',
  version: overrides.version ?? '1.0.0',
  description: 'MCP server that connects AI models to GROWI wiki content.',
  settings: [{ name: 'App Name', description: 'Name identifier for the GROWI app', envVar: 'GROWI_APP_NAME_1' }],
  mcpServers: overrides.mcpServers ?? { growi: buildServerEntry(overrides.args ?? ['-y', '@growi/mcp-server@1.0.0']) },
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

  it('leaves the other launch arguments, their order, and every other key of the entry untouched', () => {
    const manifest = buildGeminiManifest();
    const entry = manifest.mcpServers.growi;

    const result = applyVersionToGeminiManifest(manifest, '2.3.4');

    expect(result.mcpServers.growi).toEqual({ ...entry, args: ['-y', '@growi/mcp-server@2.3.4'] });
  });

  it('leaves the other manifest keys untouched', () => {
    const manifest = buildGeminiManifest();
    const result = applyVersionToGeminiManifest(manifest, '2.3.4');

    expect(result.name).toBe(manifest.name);
    expect(result.description).toBe(manifest.description);
    expect(result.settings).toEqual(manifest.settings);
  });

  it('keeps other mcpServers entries and their arguments as they are', () => {
    const other = { command: 'uvx', args: ['some-other-server@0.1.0'] };
    const manifest = buildGeminiManifest({ mcpServers: { growi: buildServerEntry(['-y', '@growi/mcp-server@1.0.0']), other } });

    const result = applyVersionToGeminiManifest(manifest, '2.3.4');

    expect(result.mcpServers.other).toEqual(other);
  });

  it('leaves an argument that names a sibling package alone', () => {
    const manifest = buildGeminiManifest({ args: ['-y', '@growi/mcp-server-cli@1.0.0'] });

    const result = applyVersionToGeminiManifest(manifest, '2.3.4');

    expect(result.mcpServers.growi.args).toEqual(['-y', '@growi/mcp-server-cli@1.0.0']);
  });

  it('passes an entry without launch arguments through untouched', () => {
    const remote = { httpUrl: 'https://mcp.example.com/mcp' };
    const manifest = buildGeminiManifest({ mcpServers: { growi: buildServerEntry(['-y', '@growi/mcp-server@1.0.0']), remote } });

    const result = applyVersionToGeminiManifest(manifest, '2.3.4');

    expect(result.mcpServers.remote).toEqual(remote);
    expect(result.mcpServers.growi.args).toEqual(['-y', '@growi/mcp-server@2.3.4']);
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

  it('does not report an argument that names a sibling package', () => {
    const violations = collectVersionViolations(
      { gemini: buildGeminiManifest({ version: '2.3.4', args: ['-y', '@growi/mcp-server-cli@1.0.0'] }), plugin: buildPluginManifest('2.3.4') },
      '2.3.4',
    );

    expect(violations).toEqual([]);
  });

  it('does not report an entry without launch arguments', () => {
    const mcpServers = { growi: buildServerEntry(['-y', '@growi/mcp-server@2.3.4']), remote: { httpUrl: 'https://mcp.example.com/mcp' } };
    const violations = collectVersionViolations(
      { gemini: buildGeminiManifest({ version: '2.3.4', mcpServers }), plugin: buildPluginManifest('2.3.4') },
      '2.3.4',
    );

    expect(violations).toEqual([]);
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

    expect(violations).toHaveLength(3);
    expect(violations).toEqual(
      expect.arrayContaining([
        { file: 'gemini-extension.json', location: 'version', found: '1.0.0', expected: '2.3.4' },
        { file: 'gemini-extension.json', location: 'mcpServers.growi.args[1]', found: '@growi/mcp-server@1.0.0', expected: '@growi/mcp-server@2.3.4' },
        { file: '.claude-plugin/plugin.json', location: 'version', found: '1.0.0', expected: '2.3.4' },
      ]),
    );
  });
});

describe('the check mode and the rewrite mode agree', () => {
  const version = '2.3.4';

  const inSyncArgs = ['-y', `@growi/mcp-server@${version}`];

  const cases: readonly {
    readonly label: string;
    readonly gemini: GeminiExtensionManifest;
    readonly plugin: ClaudePluginManifest;
    readonly inSync: boolean;
  }[] = [
    {
      label: 'everything already matches',
      gemini: buildGeminiManifest({ version, args: inSyncArgs }),
      plugin: buildPluginManifest(version),
      inSync: true,
    },
    {
      label: 'only the displayed version is stale',
      gemini: buildGeminiManifest({ version: '1.0.0', args: inSyncArgs }),
      plugin: buildPluginManifest(version),
      inSync: false,
    },
    {
      label: 'only the launch argument is stale',
      gemini: buildGeminiManifest({ version, args: ['-y', '@growi/mcp-server@1.0.0'] }),
      plugin: buildPluginManifest(version),
      inSync: false,
    },
    {
      label: 'the launch argument carries no version yet',
      gemini: buildGeminiManifest({ version, args: ['-y', '@growi/mcp-server'] }),
      plugin: buildPluginManifest(version),
      inSync: false,
    },
    {
      label: 'only the plugin manifest is stale',
      gemini: buildGeminiManifest({ version, args: inSyncArgs }),
      plugin: buildPluginManifest('1.0.0'),
      inSync: false,
    },
    {
      label: 'a second entry is stale while the first one matches',
      gemini: buildGeminiManifest({
        version,
        mcpServers: { growi: buildServerEntry(inSyncArgs), secondary: buildServerEntry(['-y', '@growi/mcp-server@1.0.0']) },
      }),
      plugin: buildPluginManifest(version),
      inSync: false,
    },
    {
      label: 'a first entry is stale while the second one matches',
      gemini: buildGeminiManifest({
        version,
        mcpServers: { growi: buildServerEntry(['-y', '@growi/mcp-server@1.0.0']), secondary: buildServerEntry(inSyncArgs) },
      }),
      plugin: buildPluginManifest(version),
      inSync: false,
    },
    {
      label: 'an entry has an empty argument list',
      gemini: buildGeminiManifest({ version, args: [] }),
      plugin: buildPluginManifest(version),
      inSync: true,
    },
    {
      label: 'an entry carries no launch arguments at all',
      gemini: buildGeminiManifest({ version, mcpServers: { remote: { httpUrl: 'https://mcp.example.com/mcp' } } }),
      plugin: buildPluginManifest(version),
      inSync: true,
    },
    {
      label: 'an argument names a sibling package only',
      gemini: buildGeminiManifest({ version, args: ['-y', '@growi/mcp-server-cli@1.0.0'] }),
      plugin: buildPluginManifest(version),
      inSync: true,
    },
  ];

  it.each(cases)('reports no violation exactly when the rewrite changes nothing: $label', ({ gemini, plugin, inSync }) => {
    const reportsNoViolation = collectVersionViolations({ gemini, plugin }, version).length === 0;
    const rewriteChangesNothing =
      isDeepStrictEqual(applyVersionToGeminiManifest(gemini, version), gemini) && isDeepStrictEqual(applyVersionToPluginManifest(plugin, version), plugin);

    expect(reportsNoViolation).toBe(rewriteChangesNothing);
    expect(reportsNoViolation).toBe(inSync);
  });
});

describe('extractPackageVersion', () => {
  it('returns the version of the single source of truth', () => {
    expect(extractPackageVersion({ version: '2.3.4' })).toBe('2.3.4');
  });

  it('drops surrounding whitespace so the written launch argument stays resolvable', () => {
    expect(extractPackageVersion({ version: ' 2.3.4 ' })).toBe('2.3.4');
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
