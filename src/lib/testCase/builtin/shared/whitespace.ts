/**
 * A run of output, split so that whitespace which cannot be seen can be drawn.
 *
 * Only *trailing* whitespace is ever singled out: whitespace running to the end
 * of a line, and the run at the end of the output. Whitespace between two
 * non-whitespace characters is left in the text, because a gap you can see
 * needs no help.
 *
 * Whitespace segments are one character each. That keeps a glyph from having
 * to span characters of differing width (a tab advances to a tab stop, a space
 * does not) and it is the granularity a per-character diff would want later.
 */
export type SegmentKind = 'text' | 'space' | 'tab' | 'newline' | 'return';

export type Segment = {
  kind: SegmentKind;
  value: string;
};

const KIND: Readonly<Record<string, SegmentKind>> = {
  ' ': 'space',
  '\t': 'tab',
  '\n': 'newline',
  '\r': 'return'
};

/**
 * Split an output into segments, marking the whitespace a reader cannot see.
 *
 * A space, tab or carriage return is trailing when nothing but whitespace
 * follows it on its own line. A line break is trailing only when nothing but
 * whitespace follows it in the whole output, since a break in the middle of an
 * output is already visible as the start of the next line.
 */
export function segmentOutput(output: string): Segment[] {
  const trailing = new Array<boolean>(output.length);

  // One backwards pass. `inLine` tracks whether real content follows within
  // this line, `anywhere` whether any follows at all; a line break consults
  // the second because it belongs to the output's tail, not to a line's.
  let inLine = false;
  let anywhere = false;
  for (let i = output.length - 1; i >= 0; i--) {
    const character = output[i];

    if (character === '\n') {
      trailing[i] = !anywhere;
      inLine = false;
      continue;
    }

    if (character === ' ' || character === '\t' || character === '\r') {
      trailing[i] = !inLine;
      continue;
    }

    trailing[i] = false;
    inLine = true;
    anywhere = true;
  }

  const segments: Segment[] = [];
  let text = '';

  for (let i = 0; i < output.length; i++) {
    const character = output[i];

    if (!trailing[i]) {
      text += character;
      continue;
    }

    if (text !== '') {
      segments.push({ kind: 'text', value: text });
      text = '';
    }
    segments.push({ kind: KIND[character] ?? 'text', value: character });
  }

  if (text !== '') segments.push({ kind: 'text', value: text });

  return segments;
}
