import type { Config } from './types';

const config: Config = {
  server: {
    port: Number(process.env.PORT) || 3000,
  },
  growi: {
    // GROWI API configuration
    baseUrl: process.env.GROWI_BASE_URL || 'http://localhost:3001',
    apiToken: process.env.GROWI_API_TOKEN || '',
    // Optional: API version to use (v1 or v3)
    apiVersion: (process.env.GROWI_API_VERSION || 'v3') as 'v1' | 'v3',
  },
};

export default config;
