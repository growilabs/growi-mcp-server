import { describe, expect, it } from 'vitest';
import { decodeVaultName } from './decode-name.js';

describe('decodeVaultName', () => {
  it('leaves a name with nothing encoded untouched', () => {
    expect(decodeVaultName('plain page.md')).toBe('plain page.md');
  });

  it('decodes an escaped character back to the page path segment', () => {
    expect(decodeVaultName('旧%3A old page.md')).toBe('旧: old page.md');
  });

  it('decodes a multi-byte character spanning several escapes', () => {
    expect(decodeVaultName('%E6%97%A5%E6%9C%AC%E8%AA%9E.md')).toBe('日本語.md');
  });

  it('preserves an encoded newline', () => {
    expect(decodeVaultName('a%0Ab')).toBe('a\nb');
  });

  it('keeps a percent sign that is not an escape sequence', () => {
    expect(decodeVaultName('100% done.md')).toBe('100% done.md');
    expect(decodeVaultName('%zz')).toBe('%zz');
  });

  it('keeps a byte sequence that is not valid UTF-8 rather than failing', () => {
    expect(decodeVaultName('%FF%FE.md')).toBe('%FF%FE.md');
  });

  it('decodes every escape in a name that mixes them with plain text', () => {
    expect(decodeVaultName('a%3Ab plain %2F c')).toBe('a:b plain / c');
  });

  it('returns an empty string unchanged', () => {
    expect(decodeVaultName('')).toBe('');
  });
});
