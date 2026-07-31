import { createTwoFilesPatch } from 'diff';

const DEFAULT_CONTEXT_LINES = 3;

/**
 * Builds a unified diff between two page bodies (used by editPage dryRun previews).
 */
export const buildUnifiedDiff = (oldBody: string, newBody: string, label = 'page', contextLines = DEFAULT_CONTEXT_LINES): string => {
  return createTwoFilesPatch(label, label, oldBody, newBody, undefined, undefined, { context: contextLines });
};
