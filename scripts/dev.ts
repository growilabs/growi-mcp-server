#!/usr/bin/env node

import 'dotenv-flow/config'; // Load environment variables first
import { execa } from 'execa';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

(async () => {
  const argv = await yargs(hideBin(process.argv))
    .command('$0 <file>', 'Start a development server with environment variables loaded', (yargs) => {
      return yargs.positional('file', {
        demandOption: true,
        describe: 'The path to the server file (e.g., src/index.ts)',
        type: 'string',
      });
    })
    .help()
    .parseAsync();

  const serverFile = argv.file;

  if (!serverFile) {
    console.error('Error: Server file path is required.');
    process.exit(1);
  }

  console.log(`[CustomDevScript] Starting development server for: ${serverFile}`);
  console.log('[CustomDevScript] Environment variables should be loaded via dotenv-flow.');

  try {
    await execa('npx', ['@wong2/mcp-cli', 'npx', 'tsx', serverFile], {
      stdio: 'inherit', // Inherit stdin, stdout, stderr
    });
  } catch (error) {
    console.error('[CustomDevScript] Failed to start development server:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
})();
