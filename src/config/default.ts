import dotenvFlow from 'dotenv-flow';
import { z } from 'zod';
import type { Config, GrowiAppConfig } from './types';

// Define schema for environment variables
const envSchema = z.object({
  // PORT: z.number().optional().default(8080), // for httpStream transport
  GROWI_BASE_URLS: z.array(z.string().url()),
  GROWI_API_TOKENS: z.array(z.string()),
  GROWI_APP_NAMES: z.array(z.string()),
});

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
const parseGrowiConfig = (): Config['growi'] => {
  if (!parsedEnv.success || !parsedEnv.data) {
    throw new Error('Environment validation failed');
  }

  const { GROWI_BASE_URLS, GROWI_API_TOKENS, GROWI_APP_NAMES } = parsedEnv.data;

  const urlsLength = GROWI_BASE_URLS.length;
  const tokensLength = GROWI_API_TOKENS.length;
  const appNamesLength = GROWI_APP_NAMES.length;

  // Validate array lengths
  if (urlsLength !== tokensLength || urlsLength !== appNamesLength) {
    throw new Error('Environment variables GROWI_BASE_URLS, GROWI_API_TOKENS, and GROWI_APP_NAMES must have the same number of entries');
  }

  const result: GrowiAppConfig[] = [];
  for (let i = 0; i < GROWI_BASE_URLS.length; i++) {
    result.push({
      name: GROWI_APP_NAMES[i],
      baseUrl: GROWI_BASE_URLS[i],
      apiToken: GROWI_API_TOKENS[i],
    });
  }

  return {
    apps: result,
  };
};

const config: Config = {
  // remoteServer: {
  //   port: parsedEnv.data.PORT,
  // },
  growi: parseGrowiConfig(),
};

export default config;
