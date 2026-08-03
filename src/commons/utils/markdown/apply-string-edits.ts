/**
 * Applies literal string-replacement edits to a document body.
 *
 * Matching is literal (no regex, no whitespace normalization). Each edit must match exactly once
 * unless `replaceAll` is set — a mismatch aborts the whole batch (all-or-nothing).
 */

import { GrowiApiError } from '../../api/growi-api-error.js';

export interface StringEdit {
  oldString: string;
  newString: string;
  replaceAll?: boolean;
}

export interface EditOccurrence {
  /** 1-indexed line number where the match content starts (leading newlines in oldString are skipped) */
  line: number;
  /** 1-indexed column of the match content on that line */
  column: number;
  /** A window of the matched line centered on the match ("…" marks a cut) */
  context: string;
}

export interface EditResult {
  replacements: number;
}

const MAX_REPORTED_OCCURRENCES = 5;
const MAX_CONTEXT_LENGTH = 120;

/**
 * Edit matching failure (nothing has been written when this is thrown). Subclasses GrowiApiError
 * so it stays within the repo's two-tier error model (GrowiApiError internally, UserError at the
 * register boundary); registers may still branch on it via instanceof for a richer error payload.
 */
export class EditMatchError extends GrowiApiError {
  constructor(
    message: string,
    public editIndex: number,
    public kind: 'not-found' | 'ambiguous',
    public matchCount: number,
    public occurrences: EditOccurrence[],
  ) {
    super(message, 422, { editIndex, kind, matchCount, occurrences });
    this.name = 'EditMatchError';
  }
}

const findOccurrences = (body: string, needle: string): number[] => {
  const indices: number[] = [];
  let index = body.indexOf(needle);
  while (index !== -1) {
    indices.push(index);
    index = body.indexOf(needle, index + needle.length);
  }
  return indices;
};

const CONTEXT_RADIUS = 60;

const describeOccurrence = (body: string, index: number, needle: string): EditOccurrence => {
  // Point at the match content, not at a leading newline of the needle (which sits on the previous line)
  const displayIndex = index + (needle.match(/^\n+/)?.[0].length ?? 0);
  const line = body.slice(0, displayIndex).split('\n').length;
  const lineStart = body.lastIndexOf('\n', displayIndex - 1) + 1;
  const lineEndRaw = body.indexOf('\n', displayIndex);
  const lineEnd = lineEndRaw === -1 ? body.length : lineEndRaw;
  const column = displayIndex - lineStart + 1;

  // Window centered on the match so long lines still show the matched text
  const matchEndOnLine = Math.min(lineEnd, index + needle.length);
  const windowStart = Math.max(lineStart, displayIndex - CONTEXT_RADIUS);
  const windowEnd = Math.min(lineEnd, Math.max(displayIndex, matchEndOnLine) + CONTEXT_RADIUS, windowStart + MAX_CONTEXT_LENGTH);
  const context = `${windowStart > lineStart ? '…' : ''}${body.slice(windowStart, windowEnd)}${windowEnd < lineEnd ? '…' : ''}`;

  return { line, column, context };
};

/**
 * Applies edits sequentially against the evolving body. Later edits see the result of earlier ones.
 * @throws EditMatchError when an edit matches zero times, or multiple times without `replaceAll`
 */
export const applyStringEdits = (body: string, edits: readonly StringEdit[]): { body: string; results: EditResult[] } => {
  let currentBody = body;
  const results: EditResult[] = [];

  edits.forEach((edit, editIndex) => {
    if (edit.oldString.length === 0) {
      throw new EditMatchError(`Edit ${editIndex + 1}: oldString must not be empty`, editIndex, 'not-found', 0, []);
    }
    const occurrences = findOccurrences(currentBody, edit.oldString);

    if (occurrences.length === 0) {
      const preview = edit.oldString.length > 40 ? `${edit.oldString.slice(0, 40)}…` : edit.oldString;
      throw new EditMatchError(`Edit ${editIndex + 1}: oldString was not found in the page body (starts with: "${preview}")`, editIndex, 'not-found', 0, []);
    }

    if (occurrences.length > 1 && edit.replaceAll !== true) {
      throw new EditMatchError(
        `Edit ${editIndex + 1}: oldString matches ${occurrences.length} locations; add more surrounding context to make it unique, or set replaceAll to true`,
        editIndex,
        'ambiguous',
        occurrences.length,
        occurrences.slice(0, MAX_REPORTED_OCCURRENCES).map((index) => describeOccurrence(currentBody, index, edit.oldString)),
      );
    }

    if (edit.replaceAll === true) {
      currentBody = currentBody.split(edit.oldString).join(edit.newString);
      results.push({ replacements: occurrences.length });
    } else {
      const index = occurrences[0];
      currentBody = currentBody.slice(0, index) + edit.newString + currentBody.slice(index + edit.oldString.length);
      results.push({ replacements: 1 });
    }
  });

  return { body: currentBody, results };
};
