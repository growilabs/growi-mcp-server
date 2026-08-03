import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/** npm package name that every distribution manifest has to agree on. */
const PACKAGE_NAME = '@growi/mcp-server';

/**
 * Paths are kept relative to the repository root so that violation output stays reproducible
 * across machines (and never leaks absolute paths of a maintainer's checkout).
 */
const PACKAGE_MANIFEST_FILE = 'package.json';
const GEMINI_MANIFEST_FILE = 'gemini-extension.json';
const PLUGIN_MANIFEST_FILE = '.claude-plugin/plugin.json';

const CHECK_FLAG = '--check';

export type McpServerEntry = {
  readonly command: string;
  readonly args: readonly string[];
  readonly [key: string]: unknown;
};

export type GeminiExtensionManifest = {
  readonly name: string;
  readonly version: string;
  readonly mcpServers: Readonly<Record<string, McpServerEntry>>;
  readonly [key: string]: unknown;
};

export type ClaudePluginManifest = {
  readonly name: string;
  readonly version: string;
  readonly [key: string]: unknown;
};

export type VersionViolation = {
  readonly file: string;
  readonly location: string;
  readonly found: string;
  readonly expected: string;
};

export type ManifestSet = {
  readonly gemini: GeminiExtensionManifest;
  readonly plugin: ClaudePluginManifest;
};

const buildPackageSpec = (version: string): string => `${PACKAGE_NAME}@${version}`;

/**
 * Recognise the launch argument that pins the published package.
 *
 * Both the bare form (`@growi/mcp-server`, the state a freshly authored manifest can be in) and an
 * already pinned form (`@growi/mcp-server@1.7.0`) have to be recognised. Matching on the `@`
 * separator rather than a plain prefix keeps a sibling package such as `@growi/mcp-server-cli`
 * from being silently rewritten into this package.
 */
const isPackageSpecArg = (arg: string): boolean => arg === PACKAGE_NAME || arg.startsWith(`${PACKAGE_NAME}@`);

export const applyVersionToLaunchArgs = (args: readonly string[], version: string): readonly string[] => {
  const expected = buildPackageSpec(version);
  return args.map((arg) => (isPackageSpecArg(arg) ? expected : arg));
};

export const applyVersionToGeminiManifest = (manifest: GeminiExtensionManifest, version: string): GeminiExtensionManifest => {
  const mcpServers = Object.fromEntries(
    Object.entries(manifest.mcpServers).map(([key, entry]): [string, McpServerEntry] => [
      key,
      { ...entry, args: applyVersionToLaunchArgs(entry.args, version) },
    ]),
  );
  return { ...manifest, version, mcpServers };
};

export const applyVersionToPluginManifest = (manifest: ClaudePluginManifest, version: string): ClaudePluginManifest => ({ ...manifest, version });

const collectGeminiViolations = (manifest: GeminiExtensionManifest, version: string): readonly VersionViolation[] => {
  const expectedSpec = buildPackageSpec(version);

  const displayViolations: readonly VersionViolation[] =
    manifest.version === version ? [] : [{ file: GEMINI_MANIFEST_FILE, location: 'version', found: manifest.version, expected: version }];

  const argViolations = Object.entries(manifest.mcpServers).flatMap(([key, entry]) =>
    entry.args.flatMap((arg, index): readonly VersionViolation[] =>
      isPackageSpecArg(arg) && arg !== expectedSpec
        ? [{ file: GEMINI_MANIFEST_FILE, location: `mcpServers.${key}.args[${index}]`, found: arg, expected: expectedSpec }]
        : [],
    ),
  );

  return [...displayViolations, ...argViolations];
};

/**
 * Report every place whose version does not match the package version.
 *
 * The returned list is empty exactly when applying the transformation functions would produce no
 * diff, so the check mode and the rewrite mode can never disagree.
 */
export const collectVersionViolations = (input: ManifestSet, version: string): readonly VersionViolation[] => {
  const pluginViolations: readonly VersionViolation[] =
    input.plugin.version === version ? [] : [{ file: PLUGIN_MANIFEST_FILE, location: 'version', found: input.plugin.version, expected: version }];

  return [...collectGeminiViolations(input.gemini, version), ...pluginViolations];
};

export const formatViolation = (violation: VersionViolation): string =>
  `${violation.file}: ${violation.location}: found "${violation.found}", expected "${violation.expected}"`;

/**
 * Read the single source of truth. A missing or blank version is a hard failure: substituting a
 * default here would publish manifests pinned to a version that was never released.
 */
export const extractPackageVersion = (packageManifest: Readonly<Record<string, unknown>>): string => {
  const { version } = packageManifest;
  if (typeof version !== 'string' || version.trim() === '') {
    throw new Error(`${PACKAGE_MANIFEST_FILE} has no usable "version" string`);
  }
  return version;
};

// --- CLI layer: file access, process exit code. No decision logic beyond wiring. ---

const repoRootUrl = new URL('../', import.meta.url);

const readJsonObject = async (file: string): Promise<Record<string, unknown>> => {
  const raw = await readFile(new URL(file, repoRootUrl), 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${file} is not a JSON object`);
  }
  return parsed as Record<string, unknown>;
};

const writeJsonObject = async (file: string, value: unknown): Promise<void> => {
  // Two-space indent plus a trailing newline matches the checked-in shape; Biome owns the final formatting.
  await writeFile(new URL(file, repoRootUrl), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const assertVersionString = (file: string, value: Readonly<Record<string, unknown>>): void => {
  if (typeof value.version !== 'string') {
    throw new Error(`${file} has no "version" string`);
  }
};

const parseGeminiManifest = (value: Readonly<Record<string, unknown>>): GeminiExtensionManifest => {
  assertVersionString(GEMINI_MANIFEST_FILE, value);

  const { mcpServers } = value;
  if (typeof mcpServers !== 'object' || mcpServers === null || Array.isArray(mcpServers)) {
    throw new Error(`${GEMINI_MANIFEST_FILE} has no "mcpServers" object`);
  }
  for (const [key, entry] of Object.entries(mcpServers)) {
    const args = typeof entry === 'object' && entry !== null ? (entry as Record<string, unknown>).args : undefined;
    if (!Array.isArray(args) || args.some((arg) => typeof arg !== 'string')) {
      throw new Error(`${GEMINI_MANIFEST_FILE} has no string "args" array at "mcpServers.${key}"`);
    }
  }

  return value as unknown as GeminiExtensionManifest;
};

const parsePluginManifest = (value: Readonly<Record<string, unknown>>): ClaudePluginManifest => {
  assertVersionString(PLUGIN_MANIFEST_FILE, value);
  return value as unknown as ClaudePluginManifest;
};

const loadManifests = async (): Promise<{ readonly version: string } & ManifestSet> => {
  const [packageManifest, geminiJson, pluginJson] = await Promise.all([
    readJsonObject(PACKAGE_MANIFEST_FILE),
    readJsonObject(GEMINI_MANIFEST_FILE),
    readJsonObject(PLUGIN_MANIFEST_FILE),
  ]);

  return {
    version: extractPackageVersion(packageManifest),
    gemini: parseGeminiManifest(geminiJson),
    plugin: parsePluginManifest(pluginJson),
  };
};

const runCheck = async (): Promise<number> => {
  const { version, gemini, plugin } = await loadManifests();
  const violations = collectVersionViolations({ gemini, plugin }, version);

  if (violations.length === 0) {
    console.log(`✅ manifest versions are in sync with ${PACKAGE_MANIFEST_FILE} (${version}).`);
    return 0;
  }

  console.error(`❌ ${violations.length} manifest version mismatch(es) against ${PACKAGE_MANIFEST_FILE} (${version}):`);
  for (const violation of violations) {
    console.error(`  - ${formatViolation(violation)}`);
  }
  console.error('Run "pnpm sync:versions" to fix.');
  return 1;
};

const runSync = async (): Promise<number> => {
  const { version, gemini, plugin } = await loadManifests();

  // Transform both manifests before touching the filesystem so a failure cannot leave one file rewritten.
  const nextGemini = applyVersionToGeminiManifest(gemini, version);
  const nextPlugin = applyVersionToPluginManifest(plugin, version);

  await writeJsonObject(GEMINI_MANIFEST_FILE, nextGemini);
  await writeJsonObject(PLUGIN_MANIFEST_FILE, nextPlugin);

  console.log(`✅ synced ${GEMINI_MANIFEST_FILE} and ${PLUGIN_MANIFEST_FILE} to ${version}.`);
  return 0;
};

const isDirectRun = (): boolean => {
  const entry = process.argv[1];
  return entry != null && entry === fileURLToPath(import.meta.url);
};

if (isDirectRun()) {
  try {
    const exitCode = process.argv.includes(CHECK_FLAG) ? await runCheck() : await runSync();
    process.exit(exitCode);
  } catch (error) {
    console.error(`❌ manifest version sync failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
