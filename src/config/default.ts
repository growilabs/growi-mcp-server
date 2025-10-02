import dotenvFlow from 'dotenv-flow';
import { z } from 'zod';
import type { Config, GrowiAppConfig } from './types';

const GROWI_APP_NAME_PREFIX = 'GROWI_APP_NAME_';
const GROWI_BASE_URL_PREFIX = 'GROWI_BASE_URL_';
const GROWI_API_TOKEN_PREFIX = 'GROWI_API_TOKEN_';

// Define schema for environment variables
const envSchema = z
  .object({
    GROWI_DEFAULT_APP_NAME: z.string().optional(),
  })
  // Add unknown keys to handle numbered environment variables
  .passthrough()
  .transform((env) => {
    // Extract numbered app configurations
    const appConfigs: GrowiAppConfig[] = [];
    const appNumbers = new Set<string>();

    // Find all app numbers from environment variables
    for (const key of Object.keys(env)) {
      // https://regex101.com/r/4mnng4/1
      const regExp = /^GROWI_APP_NAME_(\d+)$/;
      const suffixNum = key.match(new RegExp(regExp));
      if (suffixNum) {
        appNumbers.add(suffixNum[1]);
      }
    }

    // Process each app number
    for (const num of Array.from(appNumbers).sort()) {
      const nameKey = `${GROWI_APP_NAME_PREFIX}${num}`;
      const urlKey = `${GROWI_BASE_URL_PREFIX}${num}`;
      const tokenKey = `${GROWI_API_TOKEN_PREFIX}${num}`;

      const name = env[nameKey];
      const baseUrl = env[urlKey];
      const apiToken = env[tokenKey];

      if (name != null && baseUrl != null && apiToken != null) {
        appConfigs.push({
          name: String(name).trim(),
          baseUrl: String(baseUrl).trim(),
          apiToken: String(apiToken).trim(),
        });
      }
    }

    return {
      appConfigs,
      defaultAppName: env.GROWI_DEFAULT_APP_NAME?.toString().trim(),
    };
  })
  .pipe(
    z
      .object({
        appConfigs: z
          .array(
            z.object({
              name: z.string().min(1),
              baseUrl: z.string().url().min(1),
              apiToken: z.string().min(1),
            }),
          )
          .min(1, 'At least one GROWI app configuration is required'),
        defaultAppName: z.string().optional(),
      })

      // Check that app names are unique
      .refine(
        (data) => {
          const names = data.appConfigs.map((app) => app.name);
          return new Set(names).size === names.length;
        },
        {
          message: 'GROWI app names must be unique',
        },
      )

      // Check that base URLs are unique
      .refine(
        (data) => {
          const urls = data.appConfigs.map((app) => app.baseUrl);
          return new Set(urls).size === urls.length;
        },
        {
          message: 'GROWI base URLs must be unique',
        },
      )

      // Check that API tokens are unique
      .refine(
        (data) => {
          const tokens = data.appConfigs.map((app) => app.apiToken);
          return new Set(tokens).size === tokens.length;
        },
        {
          message: 'GROWI API tokens must be unique',
        },
      )

      // Check that defaultAppName, if provided, matches one of the app names
      .refine(
        (data) => {
          if (data.defaultAppName == null) {
            return true;
          }
          return data.appConfigs.some((app) => app.name === data.defaultAppName);
        },
        {
          message: 'GROWI_DEFAULT_APP_NAME must match one of the configured app names',
        },
      ),
  )
  // Transform into final structured config
  .transform((data) => {
    const apps = new Map<string, GrowiAppConfig>();
    for (const appConfig of data.appConfigs) {
      apps.set(appConfig.name, appConfig);
    }
    return {
      apps,
      defaultAppName: data.defaultAppName ?? data.appConfigs[0].name,
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
