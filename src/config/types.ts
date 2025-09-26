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
  defaultAppName: string;
}

export interface Config {
  // remoteServer: RemoteServerConfig;
  growi: GrowiConfig;
}
