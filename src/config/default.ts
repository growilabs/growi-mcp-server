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
  // Split comma-separated values into arrays and trim whitespace
  .transform((env) => {
    return {
      baseUrls: env.GROWI_BASE_URLS.split(',').map((url: string) => url.trim()),
      apiTokens: env.GROWI_API_TOKENS.split(',').map((token: string) => token.trim()),
      appNames: env.GROWI_APP_NAMES.split(',').map((name: string) => name.trim()),
    };
  })
  .pipe(
    z
      // Check after comma separation
      .object({
        baseUrls: z.array(z.string().url().min(1)),
        apiTokens: z.array(z.string().min(1)),
        appNames: z.array(z.string().min(1)),
      })

      // Check that all arrays have the same length
      .refine(
        (data) => {
          const { baseUrls, apiTokens, appNames } = data;
          const urlsLength = baseUrls.length;
          const tokensLength = apiTokens.length;
          const appNamesLength = appNames.length;

          return urlsLength === tokensLength && urlsLength === appNamesLength;
        },
        {
          message: 'GROWI_BASE_URLS, GROWI_API_TOKENS, and GROWI_APP_NAMES must have the same number of comma-separated values',
        },
      )

      // Check that all values in each array are unique
      .refine(
        (data) => {
          const uniqueUrls = new Set(data.baseUrls);
          const uniqueTokens = new Set(data.apiTokens);
          const uniqueNames = new Set(data.appNames);

          const urlsUnique = uniqueUrls.size === data.baseUrls.length;
          const tokensUnique = uniqueTokens.size === data.apiTokens.length;
          const namesUnique = uniqueNames.size === data.appNames.length;

          return urlsUnique && tokensUnique && namesUnique;
        },
        {
          message: 'GROWI_BASE_URLS, GROWI_API_TOKENS, and GROWI_APP_NAMES must have unique values',
        },
      ),
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

  // Create app configurations (validation is already done in zod schema)
  const apps: GrowiAppConfig[] = baseUrls.map((baseUrl: string, index: number) => ({
    name: appNames[index],
    baseUrl,
    apiToken: apiTokens[index],
  }));

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
