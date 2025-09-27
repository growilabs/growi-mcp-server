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
    GROWI_DEFAULT_APP_NAME: z.string().optional(),
  })
  // Transform comma-separated values into arrays
  .transform((env) => {
    return {
      baseUrls: env.GROWI_BASE_URLS.split(',').map((url: string) => url.trim()),
      apiTokens: env.GROWI_API_TOKENS.split(',').map((token: string) => token.trim()),
      appNames: env.GROWI_APP_NAMES.split(',').map((name: string) => name.trim()),
      defaultAppName: env.GROWI_DEFAULT_APP_NAME?.trim(),
    };
  })
  .pipe(
    z
      // Check after comma separation
      .object({
        baseUrls: z.array(z.string().url().min(1)),
        apiTokens: z.array(z.string().min(1)),
        appNames: z.array(z.string().min(1)),
        defaultAppName: z.string().optional(),
      })

      // Check that defaultAppName, if provided, matches one of the appNames
      .refine(
        (data) => {
          if (data.defaultAppName == null) {
            return true;
          }
          return data.appNames.includes(data.defaultAppName);
        },
        {
          message: 'GROWI_DEFAULT_APP_NAME must match one of the GROWI_APP_NAMES',
        },
      )

      // Check that all arrays have the same length
      .refine(
        (data) => {
          const { baseUrls, apiTokens, appNames } = data;
          return baseUrls.length === apiTokens.length && baseUrls.length === appNames.length;
        },
        {
          message: 'GROWI_BASE_URLS, GROWI_API_TOKENS, and GROWI_APP_NAMES must have the same number of comma-separated values',
        },
      )

      // Check that all values in each array are unique
      .refine(
        (data) => {
          return [data.baseUrls, data.apiTokens, data.appNames].every((arr) => new Set(arr).size === arr.length);
        },
        {
          message: 'GROWI_BASE_URLS, GROWI_API_TOKENS, and GROWI_APP_NAMES must have unique values',
        },
      ),
  )
  // Transform into final structured config
  .transform((data) => {
    const apps = new Map<string, GrowiAppConfig>();
    for (let i = 0; i < data.baseUrls.length; i++) {
      const appConfig: GrowiAppConfig = {
        name: data.appNames[i],
        baseUrl: data.baseUrls[i],
        apiToken: data.apiTokens[i],
      };
      apps.set(data.appNames[i], appConfig);
    }
    return {
      apps,
      defaultAppName: data.defaultAppName ?? data.appNames[0],
    };
  });

// Parse environment variables
dotenvFlow.config();
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsedEnv.error.format(), null, 2));
  throw new Error('Invalid environment variables');
}

const config: Config = {
  growi: {
    ...parsedEnv.data,
  },
};

export default config;
