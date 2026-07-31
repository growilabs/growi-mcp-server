import { describe, expect, it } from 'vitest';
import { buildUnifiedDiff } from './build-unified-diff.js';

describe('buildUnifiedDiff', () => {
  it('produces a unified diff with removed and added lines', () => {
    const oldBody = ['a', 'b', 'c'].join('\n');
    const newBody = ['a', 'B', 'c'].join('\n');
    const diff = buildUnifiedDiff(oldBody, newBody, '/test/page');

    expect(diff).toContain('-b');
    expect(diff).toContain('+B');
    expect(diff).toContain('/test/page');
  });

  it('respects the contextLines parameter', () => {
    const lines = Array.from({ length: 20 }, (_, i) => `line${i}`);
    const oldBody = lines.join('\n');
    const changed = [...lines];
    changed[10] = 'CHANGED';
    const diffNarrow = buildUnifiedDiff(oldBody, changed.join('\n'), 'p', 0);
    const diffWide = buildUnifiedDiff(oldBody, changed.join('\n'), 'p', 5);

    expect(diffNarrow).not.toContain('line5');
    expect(diffWide).toContain('line5');
  });
});
