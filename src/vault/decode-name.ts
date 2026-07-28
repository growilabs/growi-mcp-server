/**
 * Decode an on-disk Vault file name back into a GROWI page path segment.
 *
 * A Vault clone percent-encodes characters that are unsafe in a file name, so the page `旧: note`
 * is stored as `旧%3A note.md`. Runs of escapes are decoded as a unit because a single multi-byte
 * character spans several of them. A run that does not decode to valid UTF-8 is left exactly as
 * written instead of throwing: these names are data coming from the wiki, and a bare `%` is a legal
 * character in a page title.
 * @param name - An on-disk file or directory name from a Vault clone
 * @returns The GROWI page path segment it represents
 */
export const decodeVaultName = (name: string): string =>
  name.replace(/(?:%[0-9A-Fa-f]{2})+/g, (run) => {
    try {
      return decodeURIComponent(run);
    } catch {
      return run;
    }
  });
