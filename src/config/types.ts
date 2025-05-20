export interface ServerConfig {
  port: number;
}

export interface GrowiConfig {
  baseUrl: string;
  apiToken: string;
  apiVersion: 'v1' | 'v3';
}

export interface Config {
  server: ServerConfig;
  growi: GrowiConfig;
}
