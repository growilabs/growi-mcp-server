import dotenvFlow from 'dotenv-flow';
import { z } from 'zod';
import type { Config } from './types';

// Define schema for environment variables
const envSchema = z.object({
  // PORT: z.number().optional().default(8080), // for httpStream transport
  GROWI_BASE_URL: z.string().url(),
  GROWI_API_TOKEN: z.string(),
});

// Parse environment variables
dotenvFlow.config();
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsedEnv.error.format(), null, 2));
  throw new Error('Invalid environment variables');
}

const config: Config = {
  // remoteServer: {
  //   port: parsedEnv.data.PORT,
  // },
  growi: {
    baseUrl: parsedEnv.data.GROWI_BASE_URL,
    apiToken: parsedEnv.data.GROWI_API_TOKEN,
  },
};

export default config;
