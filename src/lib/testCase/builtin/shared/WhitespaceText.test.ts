import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import WhitespaceText from './WhitespaceText.svelte';
import { segmentOutput } from './whitespace';

const html = (output: string) => render(WhitespaceText, { props: { segments: segmentOutput(output) } }).body;

/** The rendered text with markup removed: what a reader would select and copy. */
const asText = (output: string) =>
  html(output)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]*>/g, '');

describe('WhitespaceText', () => {
  it('renders the output unchanged as text', () => {
    // This component lives inside a <pre>. A newline or indent introduced
    // between its tags would appear on screen as part of the student's output,
    // which is why its markup is written on a single line.
    for (const output of ['1 2 3', '25\n', 'a \nb\t\nc ', '1\n\n2', '25\r\n', '  25', '']) {
      expect(asText(output)).toBe(output);
    }
  });

  it('keeps the real whitespace in the document rather than the glyph', () => {
    // The glyph is painted by a ::before, so what is in the document -- and so
    // what a selection copies -- is a genuine space, not a middle dot.
    expect(html('25  ')).toContain('data-glyph="·"');
    expect(asText('25  ')).not.toContain('·');
    expect(asText('25  ')).toBe('25  ');
  });

  it('marks each trailing character with its own glyph', () => {
    expect(html('25 \n')).toContain('data-glyph="·"');
    expect(html('25 \n')).toContain('data-glyph="⏎"');
    expect(html('25\t')).toContain('data-glyph="→"');
    expect(html('25\r\n')).toContain('data-glyph="␍"');
  });

  it('leaves whitespace that is already visible unwrapped', () => {
    // An interior line break and an interior double space need no help, so
    // they produce no spans at all.
    expect(html('1  2\n3')).not.toContain('data-glyph');
  });
});
