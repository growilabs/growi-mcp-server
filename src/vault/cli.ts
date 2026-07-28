import fs from 'node:fs';
import type { VaultAccess } from '../commons/utils/resolve-vault-access.js';
import { resolveCloneDir } from './clone-dir.js';
import { decodeVaultName } from './decode-name.js';
import { VaultSyncError, syncVault } from './sync.js';

/** The subcommands this module handles, as they appear on the command line. */
export const VAULT_COMMANDS = ['vault-sync', 'vault-path', 'vault-decode'] as const;

export type VaultCommand = (typeof VAULT_COMMANDS)[number];

export const isVaultCommand = (value: string | undefined): value is VaultCommand => VAULT_COMMANDS.includes(value as VaultCommand);

const USAGE = `Usage:
  vault-sync [--app-name <name>] [--dest <dir>] [--no-user]
      Clone the GROWI Vault on first use, refresh it afterwards, and print where it is.
      --app-name  Which configured GROWI app to use (default: GROWI_DEFAULT_APP_NAME).
      --dest      Where to keep the clone (default: what vault-path prints).
      --no-user   Leave the personal user/ space out of the working tree (first clone only).
  vault-path [--app-name <name>]
      Print the clone directory for that app without touching the network.
  vault-decode [<name>...]
      Decode on-disk Vault names into GROWI page path segments. Reads stdin when given no names.`;

interface ParsedArgs {
  appName?: string;
  dest?: string;
  noUser: boolean;
  positionals: string[];
}

const parseArgs = (args: string[]): ParsedArgs => {
  const parsed: ParsedArgs = { noUser: false, positionals: [] };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    const takeValue = (name: string): string => {
      const inlineValue = arg.startsWith(`${name}=`) ? arg.slice(name.length + 1) : undefined;
      if (inlineValue != null) {
        if (inlineValue === '') {
          throw new VaultSyncError(`${name} needs a value`, 1);
        }
        return inlineValue;
      }
      const next = args[index + 1];
      if (next == null || next.startsWith('-')) {
        throw new VaultSyncError(`${name} needs a value`, 1);
      }
      index += 1;
      return next;
    };

    if (arg === '--app-name' || arg.startsWith('--app-name=')) {
      parsed.appName = takeValue('--app-name');
    } else if (arg === '--dest' || arg.startsWith('--dest=')) {
      parsed.dest = takeValue('--dest');
    } else if (arg === '--no-user') {
      parsed.noUser = true;
    } else if (arg.startsWith('-')) {
      throw new VaultSyncError(`unknown option '${arg}'`, 1);
    } else {
      parsed.positionals.push(arg);
    }
  }

  return parsed;
};

/**
 * Resolve the Vault endpoint for an app.
 *
 * Imported on demand so `vault-decode`, which needs no configuration at all, keeps working on a
 * machine where the GROWI environment variables are not set.
 */
const loadVaultAccess = async (appName?: string): Promise<VaultAccess> => {
  try {
    const { resolveVaultAccess } = await import('../commons/utils/resolve-vault-access.js');
    return resolveVaultAccess(appName);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new VaultSyncError(
      `${message} -- set GROWI_APP_NAME_<n>, GROWI_BASE_URL_<n> and GROWI_API_TOKEN_<n> for the instance you mean, the same way the MCP server is configured`,
      1,
    );
  }
};

const readNamesFromStdin = (): string[] => {
  if (process.stdin.isTTY) {
    throw new VaultSyncError('vault-decode needs at least one name, or names on stdin', 1);
  }
  return fs
    .readFileSync(0, 'utf8')
    .split('\n')
    .filter((line, lineIndex, lines) => line !== '' || lineIndex < lines.length - 1);
};

const runVaultSync = async (args: ParsedArgs): Promise<number> => {
  if (args.positionals.length > 0) {
    throw new VaultSyncError(`unexpected argument '${args.positionals[0]}' -- pass the directory as --dest <dir>`, 1);
  }

  const access = await loadVaultAccess(args.appName);
  const dest = args.dest ?? resolveCloneDir(access.baseUrl);
  const result = syncVault({ access, dest, noUser: args.noUser });

  // Naming the instance is what lets the caller confirm it grepped the wiki it meant to.
  console.log(`vault-sync: app=${access.appName} base-url=${access.baseUrl}`);
  console.log(`vault-sync: ${result.action} ${result.dest}`);

  if (result.missingPaths.length > 0) {
    console.error(
      `vault-sync: warning: ${result.missingPaths.length} page(s) could not be written to this filesystem (most often a page name longer than it allows); continuing without them:`,
    );
    for (const missingPath of result.missingPaths) {
      console.error(`  ${missingPath}`);
    }
  }
  return 0;
};

const runVaultPath = async (args: ParsedArgs): Promise<number> => {
  if (args.positionals.length > 0) {
    throw new VaultSyncError(`unexpected argument '${args.positionals[0]}'`, 1);
  }

  const access = await loadVaultAccess(args.appName);
  console.log(resolveCloneDir(access.baseUrl));
  return 0;
};

const runVaultDecode = (args: ParsedArgs): number => {
  const names = args.positionals.length > 0 ? args.positionals : readNamesFromStdin();
  for (const name of names) {
    console.log(decodeVaultName(name));
  }
  return 0;
};

/**
 * Run one of the Vault subcommands.
 *
 * These live in the same package as the MCP server so that "which GROWI instance, and with which
 * credential" is answered by the server's own configuration handling instead of being re-derived by
 * the caller.
 * @param command - The subcommand as typed on the command line
 * @param args - Arguments following the subcommand
 * @returns Process exit code: 0 usable, 1 usage or environment problem, 2 git failure
 */
export const runVaultCommand = async (command: VaultCommand, args: string[]): Promise<number> => {
  try {
    const parsed = parseArgs(args);
    switch (command) {
      case 'vault-sync':
        return await runVaultSync(parsed);
      case 'vault-path':
        return await runVaultPath(parsed);
      case 'vault-decode':
        return runVaultDecode(parsed);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${command}: error: ${message}`);
    if (error instanceof VaultSyncError && error.exitCode === 1) {
      console.error(USAGE);
    }
    return error instanceof VaultSyncError ? error.exitCode : 2;
  }
};
