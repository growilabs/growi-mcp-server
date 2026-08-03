import { describe, expect, it } from 'vitest';
import { HeadingMatchError, parseMarkdownOutline, resolveHeadingRange, splitLines } from './parse-outline.js';

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

  it('treats a delimited leading "---" block as frontmatter even when it contains heading-like lines', () => {
    const body = ['---', '# A', 'text', '---', '# B'].join('\n');
    const { outline } = parseMarkdownOutline(body);

    expect(outline.map((entry) => entry.text)).toEqual(['B']);
  });

  it('omits headings after an unterminated fence (the fence runs to EOF per CommonMark)', () => {
    const body = ['# A', '```js', 'code', '# B'].join('\n');
    const { outline } = parseMarkdownOutline(body);

    expect(outline.map((entry) => entry.text)).toEqual(['A']);
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
    expect(outline[0]).toMatchObject({ level: 2, text: 'Indented', raw: 'Indented' });
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

  it('detects setext headings and starts their section at the text line', () => {
    const body = ['Title', '=====', 'body', '', 'Sub', '-----', 'more'].join('\n');
    const { outline, preamble } = parseMarkdownOutline(body);

    expect(preamble).toBeUndefined();
    expect(outline).toHaveLength(2);
    expect(outline[0]).toMatchObject({ level: 1, text: 'Title', raw: 'Title', startLine: 1, endLine: 7 });
    expect(outline[1]).toMatchObject({ level: 2, text: 'Sub', raw: 'Sub', startLine: 5, endLine: 7 });
  });

  it('does not report heading-like lines inside an HTML block', () => {
    const body = ['<div>', '# fake', '</div>', '', '# real'].join('\n');
    const { outline } = parseMarkdownOutline(body);

    expect(outline.map((entry) => entry.text)).toEqual(['real']);
  });

  it('detects an indented heading inside a nested list', () => {
    const body = ['- a', '    - b', '        # heading', '', '# outside'].join('\n');
    const { outline } = parseMarkdownOutline(body);

    expect(outline.map((entry) => entry.text)).toEqual(['heading', 'outside']);
    expect(outline[0]).toMatchObject({ level: 1, raw: 'heading', startLine: 3 });
  });

  it('returns the rendered text and the authored notation as separate labels', () => {
    const body = ['## **Bold** and `code` ##', 'x'].join('\n');
    const { outline } = parseMarkdownOutline(body);

    expect(outline[0]).toMatchObject({ text: 'Bold and code', raw: '**Bold** and `code`' });
  });

  it('keeps a heading whose label renders empty', () => {
    const body = ['#', 'text', '## Next', 'y'].join('\n');
    const { outline } = parseMarkdownOutline(body);

    expect(outline).toHaveLength(2);
    expect(outline[0]).toMatchObject({ level: 1, text: '', raw: '', startLine: 1, endLine: 4 });
    expect(outline[1]).toMatchObject({ level: 2, text: 'Next', startLine: 3, endLine: 4 });
  });
});

describe('resolveHeadingRange', () => {
  const body = ['# Top', '## Setup', 'install', '### Details', 'deep', '## Setup', 'second', '## Usage', 'use'].join('\n');
  const { outline } = parseMarkdownOutline(body);

  it('resolves a unique heading to its full section range', () => {
    const range = resolveHeadingRange(outline, 'Usage', true);
    expect(range).toMatchObject({ startLine: 8, endLine: 9 });
  });

  it('resolves a heading by either the rendered text or the authored notation', () => {
    const decorated = ['# Top', '## **Bold** section', 'body'].join('\n');
    const parsed = parseMarkdownOutline(decorated);

    expect(resolveHeadingRange(parsed.outline, 'Bold section', true)).toMatchObject({ startLine: 2, endLine: 3 });
    expect(resolveHeadingRange(parsed.outline, '**Bold** section', true)).toMatchObject({ startLine: 2, endLine: 3 });
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

// A bare `\r` is a line ending to the parser but not to `split('\n')`. Bodies reach here already
// LF-normalized in practice, but the common `replace(/\r\n/g, '\n')` leaves lone `\r` behind, and
// mismatched line numbers reported one heading's position against another heading's text.
describe('parseMarkdownOutline with mixed line endings', () => {
  const mixed = '# Intro\nSome text\r## Sub\rmore\n# Next\ntail';

  it('keeps heading line numbers aligned with the source when a bare CR appears inside a fence', () => {
    const body = ['# Title', '', '```', 'downloading...\rdone', '```', '', '## After', 'tail'].join('\n');
    const { outline, totalLines } = parseMarkdownOutline(body);

    expect(totalLines).toBe(9);
    expect(outline.map((entry) => entry.text)).toEqual(['Title', 'After']);
    expect(outline[1]).toMatchObject({ text: 'After', raw: 'After', startLine: 8, endLine: 9 });
  });

  it('never reports a section that ends before it starts', () => {
    for (const entry of parseMarkdownOutline(mixed).outline) {
      expect(entry.endLine).toBeGreaterThanOrEqual(entry.startLine);
      expect(entry.chars).toBeGreaterThanOrEqual(0);
    }
  });

  it('resolves every heading to the line that actually holds it', () => {
    const lines = splitLines(mixed);

    for (const entry of parseMarkdownOutline(mixed).outline) {
      expect(lines[entry.startLine - 1]).toContain(entry.raw);
    }
  });

  it('does not throw on a body that mixes CR and LF', () => {
    expect(() => parseMarkdownOutline('# A\nbody\r## B\rmore\n# C')).not.toThrow();
  });

  it('counts section characters exactly for CRLF bodies', () => {
    const body = ['pre', '# A', 'aaa', '# B', 'bb'].join('\r\n');
    const { outline, preamble } = parseMarkdownOutline(body);

    // preamble + CRLF + sectionA + CRLF + sectionB reassembles the whole body
    expect((preamble?.chars ?? 0) + 2 + outline[0].chars + 2 + outline[1].chars).toBe(body.length);
  });
});

describe('section character counts', () => {
  it('counts a section as its own text, independent of the body-terminating newline', () => {
    const withoutTrailing = parseMarkdownOutline('# A\ntail');
    const withTrailing = parseMarkdownOutline('# A\ntail\n');

    // Identical content must report an identical size; the newline that ends the file is not
    // part of the section, so it is not counted (unlike the totalChars of the whole body)
    expect(withoutTrailing.outline[0].chars).toBe('# A\ntail'.length);
    expect(withTrailing.outline[0].chars).toBe('# A\ntail'.length);
    expect(withTrailing.totalChars).toBe('# A\ntail\n'.length);
  });

  it('excludes only the separating newline, keeping blank lines that belong to the section', () => {
    const { outline } = parseMarkdownOutline('# A\ntail\n\n\n# B\nmore');

    expect(outline[0].chars).toBe('# A\ntail\n\n'.length);
  });
});

describe('authored heading labels', () => {
  // `raw` exists so a caller can build an editPage oldString from it, so it has to be text that
  // actually occurs in the body. Slicing by syntax-tree offsets guarantees that; reassembling the
  // label from trimmed lines did not, inside a blockquote or list item.
  it.each([
    ['ATX', '## Title'],
    ['ATX with a closing sequence', '   ## Indented ##'],
    ['ATX in a blockquote', '> # Quoted\n> text'],
    ['ATX in a list item', '- # InList\n'],
    ['setext', 'Title\n====='],
    ['multi-line setext', 'Line one\nline two\n=====\n'],
    ['multi-line setext in a blockquote', '> Title\n> more\n> =====\nx'],
  ])('reports a label that occurs verbatim in the body (%s)', (_name, body) => {
    const { raw } = parseMarkdownOutline(body).outline[0];

    expect(raw).not.toBe('');
    expect(body).toContain(raw);
  });
});
