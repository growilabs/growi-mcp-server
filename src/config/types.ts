// export interface RemoteServerConfig {
//   port: number;
// }

export interface GrowiAppConfig {
  name: string;
  baseUrl: string;
  apiToken: string;
}

export interface GrowiConfig {
  apps: GrowiAppConfig[];
  defaultApp?: string;
  // Legacy single app config (for backward compatibility)
  baseUrl?: string;
  apiToken?: string;
}

export interface Config {
  // remoteServer: RemoteServerConfig;
  growi: GrowiConfig;
}
