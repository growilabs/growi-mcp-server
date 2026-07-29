import { describe, expect, it } from 'vitest';
import { HeadingMatchError, parseMarkdownOutline, resolveHeadingRange } from './parse-outline.js';

describe('parseMarkdownOutline', () => {
  it('parses a flat heading structure with correct line ranges', () => {
    const body = ['# Title', 'intro', '## Section A', 'a1', 'a2', '## Section B', 'b1'].join('\n');
    const { outline, preamble, totalLines, totalChars } = parseMarkdownOutline(body);

    expect(totalLines).toBe(7);
    expect(totalChars).toBe(body.length);
    expect(preamble).toBeUndefined();
    expect(outline).toHaveLength(3);
    expect(outline[0]).toMatchObject({ level: 1, text: 'Title', startLine: 1, endLine: 7 });
    expect(outline[1]).toMatchObject({ level: 2, text: 'Section A', startLine: 3, endLine: 5 });
    expect(outline[2]).toMatchObject({ level: 2, text: 'Section B', startLine: 6, endLine: 7 });
  });

  it('ends a section at the next heading of the same or higher level (subsections stay inside)', () => {
    const body = ['## Parent', '### Child', 'text', '## Next'].join('\n');
    const { outline } = parseMarkdownOutline(body);

    expect(outline[0]).toMatchObject({ text: 'Parent', endLine: 3 });
    expect(outline[1]).toMatchObject({ text: 'Child', endLine: 3 });
  });

  it('reports content before the first heading as preamble', () => {
    const body = ['some intro', 'more intro', '# First'].join('\n');
    const { outline, preamble } = parseMarkdownOutline(body);

    expect(preamble).toMatchObject({ startLine: 1, endLine: 2 });
    expect(outline[0].startLine).toBe(3);
  });

  it('treats a document without headings as all preamble', () => {
    const body = 'just text\nno headings';
    const { outline, preamble } = parseMarkdownOutline(body);

    expect(outline).toHaveLength(0);
    expect(preamble).toMatchObject({ startLine: 1, endLine: 2, chars: body.length });
  });

  it('ignores heading-like lines inside backtick fenced code blocks', () => {
    const body = ['# Real', '```sh', '# fake heading', '```', 'after'].join('\n');
    const { outline } = parseMarkdownOutline(body);

    expect(outline.map((entry) => entry.text)).toEqual(['Real']);
  });

  it('ignores heading-like lines inside tilde fenced code blocks', () => {
    const body = ['~~~', '# fake', '~~~', '## real'].join('\n');
    const { outline } = parseMarkdownOutline(body);

    expect(outline.map((entry) => entry.text)).toEqual(['real']);
  });

  it('does not close a fence with a shorter or different marker', () => {
    const body = ['````', '```', '# still inside', '````', '# outside'].join('\n');
    const { outline } = parseMarkdownOutline(body);

    expect(outline.map((entry) => entry.text)).toEqual(['outside']);
  });

  it('ignores content inside YAML frontmatter', () => {
    const body = ['---', 'title: x', 'tags: [a, b]', '---', '# real'].join('\n');
    const { outline } = parseMarkdownOutline(body);

    expect(outline).toHaveLength(1);
    expect(outline[0]).toMatchObject({ text: 'real', startLine: 5 });
  });

  it('does not mistake a leading thematic break for frontmatter when headings follow', () => {
    const body = ['---', '# A', 'text', '---', '# B'].join('\n');
    const { outline } = parseMarkdownOutline(body);

    expect(outline.map((entry) => entry.text)).toEqual(['A', 'B']);
  });

  it('flags an unterminated fence (headings after it run inside the fence per CommonMark)', () => {
    const body = ['# A', '```js', 'code', '# B'].join('\n');
    const { outline, unterminatedFence } = parseMarkdownOutline(body);

    expect(outline.map((entry) => entry.text)).toEqual(['A']);
    expect(unterminatedFence).toBe(true);
  });

  it('does not set unterminatedFence for balanced fences', () => {
    const body = ['# A', '```', 'code', '```'].join('\n');
    expect(parseMarkdownOutline(body).unterminatedFence).toBeUndefined();
  });

  it('accepts the "..." YAML frontmatter terminator', () => {
    const body = ['---', 'title: x', '...', '# real'].join('\n');
    const { outline } = parseMarkdownOutline(body);

    expect(outline).toHaveLength(1);
    expect(outline[0]).toMatchObject({ text: 'real', startLine: 4 });
  });

  it('does not treat an unterminated leading "---" as frontmatter', () => {
    const body = ['---', 'title: x', 'no closing delimiter'].join('\n');
    const { outline, preamble } = parseMarkdownOutline(body);

    expect(outline).toHaveLength(0);
    expect(preamble).toMatchObject({ startLine: 1, endLine: 3 });
  });

  it('tolerates CRLF line endings for headings and fences', () => {
    const body = '# A\r\nx\r\n```\r\n# fake\r\n```\r\n## B\r\ny';
    const { outline } = parseMarkdownOutline(body);

    expect(outline.map((entry) => entry.text)).toEqual(['A', 'B']);
    expect(outline[1]).toMatchObject({ level: 2, startLine: 6 });
  });

  it('handles an empty body', () => {
    const { outline, preamble, totalLines, totalChars } = parseMarkdownOutline('');

    expect(outline).toHaveLength(0);
    expect(totalLines).toBe(1);
    expect(totalChars).toBe(0);
    expect(preamble).toMatchObject({ startLine: 1, endLine: 1, chars: 0 });
  });

  it('strips ATX closing sequences and tolerates up to 3 leading spaces', () => {
    const body = ['   ## Indented ##', '#NotAHeading', '####### too deep'].join('\n');
    const { outline } = parseMarkdownOutline(body);

    expect(outline).toHaveLength(1);
    expect(outline[0]).toMatchObject({ level: 2, text: 'Indented' });
  });

  it('computes section chars to reassemble exactly into the body', () => {
    const body = ['pre', '# A', 'aaa', '# B', 'bb'].join('\n');
    const { outline, preamble } = parseMarkdownOutline(body);

    // preamble + newline + sectionA + newline + sectionB == whole body
    const sumChars = (preamble?.chars ?? 0) + 1 + outline[0].chars + 1 + outline[1].chars;
    expect(sumChars).toBe(body.length);
  });

  it('handles a heading on the last line', () => {
    const body = 'text\n# End';
    const { outline } = parseMarkdownOutline(body);

    expect(outline[0]).toMatchObject({ startLine: 2, endLine: 2, chars: '# End'.length });
  });
});

describe('resolveHeadingRange', () => {
  const body = ['# Top', '## Setup', 'install', '### Details', 'deep', '## Setup', 'second', '## Usage', 'use'].join('\n');
  const { outline } = parseMarkdownOutline(body);

  it('resolves a unique heading to its full section range', () => {
    const range = resolveHeadingRange(outline, 'Usage', true);
    expect(range).toMatchObject({ startLine: 8, endLine: 9 });
  });

  it('falls back to case-insensitive matching', () => {
    const range = resolveHeadingRange(outline, 'usage', true);
    expect(range.matched.text).toBe('Usage');
  });

  it('excludes subsections when includeSubsections is false', () => {
    const single = ['## Parent', 'text', '### Child', 'deep'].join('\n');
    const parsed = parseMarkdownOutline(single);
    const range = resolveHeadingRange(parsed.outline, 'Parent', false);
    expect(range).toMatchObject({ startLine: 1, endLine: 2 });
  });

  it('throws not-found with candidates for an unknown heading', () => {
    expect.assertions(2);
    try {
      resolveHeadingRange(outline, 'Missing', true);
    } catch (error) {
      expect(error).toBeInstanceOf(HeadingMatchError);
      expect((error as HeadingMatchError).kind).toBe('not-found');
    }
  });

  it('throws ambiguous when multiple headings match', () => {
    expect.assertions(3);
    try {
      resolveHeadingRange(outline, 'Setup', true);
    } catch (error) {
      expect(error).toBeInstanceOf(HeadingMatchError);
      expect((error as HeadingMatchError).kind).toBe('ambiguous');
      expect((error as HeadingMatchError).candidates).toHaveLength(2);
    }
  });
});
