import { describe, expect, it } from 'vitest';
import { buildBasicAuthHeader } from './build-basic-auth-header.js';

// The observable contract is the wire format a server decodes: "Basic " + base64("username:password").
// Tests decode the header back rather than asserting a hard-coded base64 string, so they verify the
// meaning (the credentials round-trip) instead of a particular encoding incantation.
const decodeCredentials = (header: string): string => {
  expect(header.startsWith('Basic ')).toBe(true);
  return Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8');
};

describe('buildBasicAuthHeader', () => {
  it('encodes username and password as "username:password"', () => {
    const header = buildBasicAuthHeader('user', 'password');
    expect(decodeCredentials(header)).toBe('user:password');
  });

  it('only splits on the first colon so passwords containing colons survive', () => {
    const header = buildBasicAuthHeader('user', 'p:a:ss');
    expect(decodeCredentials(header)).toBe('user:p:a:ss');
  });

  it('preserves non-ASCII characters', () => {
    const header = buildBasicAuthHeader('ユーザー', 'パスワード');
    expect(decodeCredentials(header)).toBe('ユーザー:パスワード');
  });
});
