import type { Config } from './types';

const config: Config = {
  server: {
    port: Number(process.env.PORT) || 8080,
  },
  growi: {
    // GROWI API configuration
    baseUrl: process.env.GROWI_BASE_URL || 'http://localhost:3000',
    apiToken: process.env.GROWI_API_TOKEN || '',
  },
};

export default config;
