import { describe, expect, it } from 'vitest';
import { segmentOutput } from './whitespace';

/** Render segments compactly: text as itself, marked whitespace as its kind. */
const sketch = (output: string) =>
  segmentOutput(output)
    .map((segment) => (segment.kind === 'text' ? segment.value : `[${segment.kind}]`))
    .join('');

const cases: Array<{ name: string; output: string; sketch: string }> = [
  { name: 'output with nothing to mark', output: '1 2 3', sketch: '1 2 3' },
  { name: 'the empty output', output: '', sketch: '' },

  // The case the whole feature exists for: a <pre> renders this identically
  // to the same output without the newline.
  { name: 'a single trailing newline', output: '25\n', sketch: '25[newline]' },
  { name: 'several trailing newlines', output: '25\n\n\n', sketch: '25[newline][newline][newline]' },
  { name: 'trailing spaces at the end', output: '25  ', sketch: '25[space][space]' },
  { name: 'a trailing tab', output: '25\t', sketch: '25[tab]' },
  { name: 'trailing CRLF', output: '25\r\n', sketch: '25[return][newline]' },
  { name: 'an output of only whitespace', output: ' \n', sketch: '[space][newline]' },

  // Whitespace at the end of an interior line is just as invisible, but the
  // line break that follows it is not.
  { name: 'a trailing space on an interior line', output: 'a \nb', sketch: 'a[space]\nb' },
  { name: 'trailing whitespace on every line', output: 'a \nb\t\nc ', sketch: 'a[space]\nb[tab]\nc[space]' },

  // Left alone: a gap you can see needs no glyph.
  { name: 'an interior line break', output: '1\n2\n', sketch: '1\n2[newline]' },
  { name: 'an interior blank line', output: '1\n\n2', sketch: '1\n\n2' },
  { name: 'an interior double space', output: '1  2', sketch: '1  2' },
  { name: 'leading whitespace', output: '  25', sketch: '  25' },
  { name: 'leading whitespace on a later line', output: '1\n  2', sketch: '1\n  2' }
];

describe('segmentOutput', () => {
  it.each(cases)('marks $name', ({ output, sketch: expected }) => {
    expect(sketch(output)).toBe(expected);
  });

  it('never loses or invents a character', () => {
    // The display shows the student's full output. Segmenting is a way of
    // drawing it, never of editing it, so reassembly must be exact.
    for (const { output } of cases) {
      expect(
        segmentOutput(output)
          .map((segment) => segment.value)
          .join('')
      ).toBe(output);
    }
  });

  it('gives every marked segment exactly one character', () => {
    // A glyph is drawn over one character's box; a segment spanning two would
    // misplace it, and a tab's width is not a space's.
    for (const { output } of cases) {
      const marked = segmentOutput(output).filter((segment) => segment.kind !== 'text');
      expect(marked.every((segment) => segment.value.length === 1)).toBe(true);
    }
  });
});
