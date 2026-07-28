/**
 * Build an HTTP Basic `Authorization` header value from credentials.
 *
 * Used when GROWI sits behind Basic authentication (e.g. a reverse proxy). The header
 * carries the proxy credentials, while the GROWI API token is sent separately via the
 * `X-GROWI-ACCESS-TOKEN` header by the SDK. Per RFC 7617 the value is the base64 of
 * `username:password`.
 * @param username - HTTP auth username
 * @param password - HTTP auth password
 * @returns The `Authorization` header value, e.g. `Basic dXNlcjpwYXNz`
 */
export const buildBasicAuthHeader = (username: string, password: string): string => {
  const encoded = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${encoded}`;
};
