export interface ServerConfig {
  port: number;
}

export interface GrowiConfig {
  baseUrl: string;
  apiToken: string;
}

export interface Config {
  server: ServerConfig;
  growi: GrowiConfig;
}
