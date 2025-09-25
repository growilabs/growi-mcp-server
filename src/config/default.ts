import dotenvFlow from 'dotenv-flow';
import { z } from 'zod';
import type { Config, GrowiAppConfig } from './types';

// Define schema for environment variables
const envSchema = z
  .object({
    // PORT: z.number().optional().default(8080), // for httpStream transport
    GROWI_BASE_URLS: z.string(),
    GROWI_API_TOKENS: z.string(),
    GROWI_APP_NAMES: z.string(),
  })
  .transform((env) => {
    return {
      baseUrls: env.GROWI_BASE_URLS.split(',').map((url: string) => url.trim()),
      apiTokens: env.GROWI_API_TOKENS.split(',').map((token: string) => token.trim()),
      appNames: env.GROWI_APP_NAMES.split(',').map((name: string) => name.trim()),
    };
  })
  .pipe(
    z.object({
      baseUrls: z.array(z.string().url().min(1)),
      apiTokens: z.array(z.string().min(1)),
      appNames: z.array(z.string().min(1)),
    }),
  );

// Parse environment variables
dotenvFlow.config();
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsedEnv.error.format(), null, 2));
  throw new Error('Invalid environment variables');
}

/**
 * Parse multi-app configuration from environment variables
 */
function parseGrowiConfig(): Config['growi'] {
  if (!parsedEnv.success || !parsedEnv.data) {
    throw new Error('Environment validation failed');
  }

  const { baseUrls, apiTokens, appNames } = parsedEnv.data;

  // Validate array lengths
  if (baseUrls.length !== apiTokens.length) {
    throw new Error('GROWI_BASE_URL and GROWI_API_TOKEN must have the same number of comma-separated values');
  }

  if (appNames.length !== baseUrls.length) {
    throw new Error('GROWI_APP_NAMES must have the same number of comma-separated values as GROWI_BASE_URL');
  }

  // Create app configurations
  const apps: GrowiAppConfig[] = baseUrls.map((baseUrl: string, index: number) => ({
    name: appNames[index],
    baseUrl,
    apiToken: apiTokens[index],
  }));

  // Check for duplicate app names
  const uniqueNames = new Set(apps.map((app) => app.name));
  if (uniqueNames.size !== apps.length) {
    throw new Error('Duplicate app names are not allowed');
  }

  // Return configuration
  if (apps.length === 1) {
    // Single app: maintain backward compatibility
    return {
      apps,
      defaultApp: apps[0].name,
      baseUrl: apps[0].baseUrl,
      apiToken: apps[0].apiToken,
    };
  }

  // Multiple apps
  return {
    apps,
    defaultApp: apps[0].name, // First app is default
  };
}

const config: Config = {
  // remoteServer: {
  //   port: parsedEnv.data.PORT,
  // },
  growi: parseGrowiConfig(),
};

export default config;
