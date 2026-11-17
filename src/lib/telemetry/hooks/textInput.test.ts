import { describe, expect, it } from 'vitest';
import { textDeltasOf } from './textInput';
import { replaySteps } from '$lib/plugins/session-replay/replay';

/** The document a recording replays to, in the frame the recorder writes. */
const replayed = (base: string, deltas: Parameters<typeof replaySteps>[1]) =>
  replaySteps(base, deltas, 'lf').at(-1)?.text;

describe('textDeltasOf', () => {
  it('slices old from the model text, so a CRLF edit reports the span it deleted', () => {
    // Monaco measures a change against its own buffer, where the line break is
    // two characters. Slicing the LF view with those numbers gave an `old` one
    // character short per line break, and the replay deletes `old.length`.
    const before = 'int main() {\r\n    return 0;\r\n}  ';
    const { deltas, text } = textDeltasOf(before, [{ rangeOffset: 12, rangeLength: 15, text: '' }]);

    expect(deltas).toEqual([{ offset: 12, old: '\n    return 0;', new: '' }]);
    expect(text).toBe('int main() {\r\n}  ');
    expect(replayed(before, deltas)).toBe('int main() {\n}  ');
  });

  it('replays what it recorded, line breaks included', () => {
    const before = 'int main() {\r\n    return 0;\r\n}\r\n';
    // Delete the whole body line, then type a replacement into the empty body.
    const first = textDeltasOf(before, [{ rangeOffset: 12, rangeLength: 15, text: '' }]);
    const second = textDeltasOf(first.text, [{ rangeOffset: 12, rangeLength: 0, text: '\r\n    return 7;' }]);
    const deltas = [...first.deltas, ...second.deltas];

    expect(replayed(before, deltas)).toBe('int main() {\n    return 7;\n}\n');
  });

  it('shifts a later change by the length the earlier ones added', () => {
    const { deltas } = textDeltasOf('abc', [
      { rangeOffset: 1, rangeLength: 0, text: 'X' },
      { rangeOffset: 3, rangeLength: 0, text: 'Y' }
    ]);

    expect(deltas).toEqual([
      { offset: 1, old: '', new: 'X' },
      { offset: 4, old: '', new: 'Y' }
    ]);
    expect(replayed('abc', deltas)).toBe('aXbcY');
  });

  it('reports a backspace at the end of a CRLF document, which logged an empty old', () => {
    // The LF view is one character shorter per line break, so a raw offset near
    // the end fell past it and `old` came back empty: the replay then deleted
    // nothing and the character survived. Every such edit shifted the rest of
    // the session.
    const before = 'int main() {\r\n    return 0;\r\n}\r\n';
    const { deltas } = textDeltasOf(before, [{ rangeOffset: 30, rangeLength: 2, text: '' }]);

    expect(deltas).toEqual([{ offset: 28, old: '\n', new: '' }]);
    expect(replayed(before, deltas)).toBe('int main() {\n    return 0;\n}');
  });

  it('reports a replacement as its own old and new', () => {
    const { deltas } = textDeltasOf('a\r\nb', [{ rangeOffset: 1, rangeLength: 2, text: '\r\nc' }]);

    expect(deltas).toEqual([{ offset: 1, old: '\n', new: '\nc' }]);
  });
});
