// export interface RemoteServerConfig {
//   port: number;
// }

/**
 * Credentials for HTTP authentication (currently Basic) enforced in front of a GROWI
 * instance, e.g. by a reverse proxy. These are distinct from GROWI's own login: they
 * guard access to the endpoint, while the GROWI API token still authenticates the API
 * itself (sent via the `X-GROWI-ACCESS-TOKEN` header when HTTP auth is enabled).
 * Scheme-agnostic on purpose so Digest support can reuse the same shape later.
 */
export interface GrowiHttpAuthConfig {
  username: string;
  password: string;
}

export interface GrowiAppConfig {
  name: string;
  baseUrl: string;
  apiToken: string;
  httpAuth?: GrowiHttpAuthConfig;
}

export interface GrowiConfig {
  apps: Map<string, GrowiAppConfig>;
  defaultAppName: string;
}

export interface Config {
  // remoteServer: RemoteServerConfig;
  growi: GrowiConfig;
}
