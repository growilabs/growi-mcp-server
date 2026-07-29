import { describe, expect, it } from 'vitest';
import { EditMatchError, applyStringEdits } from './apply-string-edits.js';

describe('applyStringEdits', () => {
  it('replaces a unique match', () => {
    const { body, results } = applyStringEdits('hello world', [{ oldString: 'world', newString: 'GROWI' }]);

    expect(body).toBe('hello GROWI');
    expect(results).toEqual([{ replacements: 1 }]);
  });

  it('deletes text when newString is empty', () => {
    const { body } = applyStringEdits('keep remove keep', [{ oldString: ' remove', newString: '' }]);
    expect(body).toBe('keep keep');
  });

  it('applies edits sequentially so later edits see earlier results', () => {
    const { body } = applyStringEdits('aaa', [
      { oldString: 'aaa', newString: 'bbb' },
      { oldString: 'bbb', newString: 'ccc' },
    ]);
    expect(body).toBe('ccc');
  });

  it('replaces all occurrences with replaceAll', () => {
    const { body, results } = applyStringEdits('x y x y x', [{ oldString: 'x', newString: 'z', replaceAll: true }]);

    expect(body).toBe('z y z y z');
    expect(results).toEqual([{ replacements: 3 }]);
  });

  it('throws not-found when oldString does not match', () => {
    expect.assertions(3);
    try {
      applyStringEdits('content', [{ oldString: 'missing', newString: 'x' }]);
    } catch (error) {
      expect(error).toBeInstanceOf(EditMatchError);
      expect((error as EditMatchError).kind).toBe('not-found');
      expect((error as EditMatchError).matchCount).toBe(0);
    }
  });

  it('throws ambiguous with line numbers and context when multiple matches exist without replaceAll', () => {
    expect.assertions(4);
    const body = ['first foo line', 'second line', 'third foo line'].join('\n');
    try {
      applyStringEdits(body, [{ oldString: 'foo', newString: 'bar' }]);
    } catch (error) {
      expect(error).toBeInstanceOf(EditMatchError);
      const matchError = error as EditMatchError;
      expect(matchError.kind).toBe('ambiguous');
      expect(matchError.matchCount).toBe(2);
      expect(matchError.occurrences).toEqual([
        { line: 1, column: 7, context: 'first foo line' },
        { line: 3, column: 7, context: 'third foo line' },
      ]);
    }
  });

  it('points at the match content when oldString starts with newlines', () => {
    expect.assertions(1);
    const body = ['alpha', 'beta', 'gamma', 'beta', 'delta'].join('\n');
    try {
      applyStringEdits(body, [{ oldString: '\nbeta', newString: '\nBETA' }]);
    } catch (error) {
      expect((error as EditMatchError).occurrences).toEqual([
        { line: 2, column: 1, context: 'beta' },
        { line: 4, column: 1, context: 'beta' },
      ]);
    }
  });

  it('centers the context window on the match inside long lines', () => {
    expect.assertions(3);
    const longLine = `${'L'.repeat(300)}dup${'R'.repeat(300)}`;
    const body = [longLine, longLine].join('\n');
    try {
      applyStringEdits(body, [{ oldString: 'dup', newString: 'x' }]);
    } catch (error) {
      const occurrence = (error as EditMatchError).occurrences[0];
      expect(occurrence.column).toBe(301);
      expect(occurrence.context).toContain('dup');
      expect(occurrence.context.startsWith('…')).toBe(true);
    }
  });

  it('rejects an empty oldString as EditMatchError instead of looping forever', () => {
    expect.assertions(2);
    try {
      applyStringEdits('content', [{ oldString: '', newString: 'x' }]);
    } catch (error) {
      expect(error).toBeInstanceOf(EditMatchError);
      expect((error as EditMatchError).kind).toBe('not-found');
    }
  });

  it('reports at most 5 occurrences for ambiguous matches', () => {
    expect.assertions(2);
    const body = Array.from({ length: 8 }, (_, i) => `line ${i} dup`).join('\n');
    try {
      applyStringEdits(body, [{ oldString: 'dup', newString: 'x' }]);
    } catch (error) {
      const matchError = error as EditMatchError;
      expect(matchError.matchCount).toBe(8);
      expect(matchError.occurrences).toHaveLength(5);
    }
  });

  it('aborts the whole batch when a later edit fails (all-or-nothing contract)', () => {
    expect.assertions(1);
    try {
      applyStringEdits('alpha beta', [
        { oldString: 'alpha', newString: 'ALPHA' },
        { oldString: 'gamma', newString: 'x' },
      ]);
    } catch (error) {
      expect((error as EditMatchError).editIndex).toBe(1);
    }
  });

  it('counts non-overlapping occurrences only', () => {
    const { results } = applyStringEdits('aaaa', [{ oldString: 'aa', newString: 'b', replaceAll: true }]);
    expect(results).toEqual([{ replacements: 2 }]);
  });

  it('handles multi-line oldString spanning a newline', () => {
    const body = 'line1\nline2\nline3';
    const { body: result } = applyStringEdits(body, [{ oldString: 'line1\nline2', newString: 'merged' }]);
    expect(result).toBe('merged\nline3');
  });
});
