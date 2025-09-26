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
  // Split comma-separated values into arrays and trim whitespace
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

const { baseUrls, apiTokens, appNames, defaultAppName } = parsedEnv.data;
const apps: GrowiAppConfig[] = [];
for (let i = 0; i < baseUrls.length; i++) {
  apps.push({
    name: appNames[i],
    baseUrl: baseUrls[i],
    apiToken: apiTokens[i],
  });
}

const config: Config = {
  // remoteServer: {
  //   port: parsedEnv.data.PORT,
  // },
  growi: {
    apps,
    defaultAppName: defaultAppName ?? apps[0].name,
  },
};

export default config;
