import { describe, expect, it } from 'vitest';
import type { JsonValue } from '@zenstackhq/orm';
import type { SessionLogDocument, SessionLogEntry, SessionLogSlot } from '$lib/analytics/sessionLogView';
import type { TextEdit } from '$lib/telemetry/types/textEvent';
import { codeSnapshots, legacyLineEndings, replayBase, replaySteps, slotAt, textDeltas } from './replay';

const entry = (type: string, data: JsonValue | null, timestamp = '2026-10-15T04:20:22.302Z'): SessionLogEntry => ({
  id: `id-${type}-${timestamp}`,
  timestamp,
  type,
  data
});

/**
 * The `baseCode` of the seeded demo problem, assembled from its slot template
 * (`%slot s1%` / `%slot s2%` markers stripped, their contents spliced in):
 * lines 3 and 7 are the slots.
 */
const BASE_CODE = [
  'float compute_square(float x) {',
  '    // Enter your code below:',
  '    return 0.0f;',
  '}',
  '',
  'void compute_square_ptr(float x, float* out) {',
  '    // Enter your code below:',
  '}',
  '',
  'int main() {',
  '    float n;',
  '    scanf("%f", &n);',
  '    printf("%f", compute_square(n));',
  '}'
].join('\n');

const SLOTS: SessionLogSlot[] = [
  { label: 's1', range: [3, 1, 3, 17], code: '    return 0.0f;', savedCode: '    return 0.0f;' },
  { label: 's2', range: [7, 1, 7, 30], code: '    // Enter your code below:', savedCode: null }
];

describe('textDeltas', () => {
  it('keeps the text edits in the order given and skips every other entry type', () => {
    const deltas = textDeltas([
      entry('CLIVE_PHASE_OPEN', { phase: 'edit' }),
      entry('TEXT_MODIFIED', { offset: 77, old: ';', new: '' }),
      entry('TEXT_MODIFIED', { offset: 158, old: '', new: '\n    ' }, '2026-10-15T05:34:16.786Z')
    ]);

    expect(deltas).toEqual([
      { timestamp: '2026-10-15T04:20:22.302Z', offset: 77, old: ';', new: '' },
      { timestamp: '2026-10-15T05:34:16.786Z', offset: 158, old: '', new: '\n    ' }
    ]);
  });

  it('skips entries whose payload is not an offset/old/new record', () => {
    const deltas = textDeltas([
      entry('TEXT_MODIFIED', null),
      entry('TEXT_MODIFIED', { offset: '77', old: ';', new: '' }),
      entry('TEXT_MODIFIED', { offset: 77, old: null, new: '' }),
      entry('TEXT_MODIFIED', [77, ';', '']),
      entry('TEXT_MODIFIED', 'debug text'),
      entry('TEXT_MODIFIED', { offset: 3, old: 'a', new: 'b' })
    ]);

    expect(deltas).toEqual([{ timestamp: '2026-10-15T04:20:22.302Z', offset: 3, old: 'a', new: 'b' }]);
  });

  it('keeps a recorded frame and leaves an unmarked payload without one', () => {
    // The field is what tells a replay which frame an offset counts in; a
    // legacy payload that has none must not acquire a guessed one.
    const deltas = textDeltas([
      entry('TEXT_MODIFIED', { offset: 0, old: '', new: 'a\r\nb', lineEndings: 'crlf' }),
      entry('TEXT_MODIFIED', { offset: 3, old: '', new: 'c' }),
      entry('TEXT_MODIFIED', { offset: 4, old: '', new: 'd', lineEndings: 'mixed' })
    ]);

    expect(deltas).toEqual([
      { timestamp: '2026-10-15T04:20:22.302Z', offset: 0, old: '', new: 'a\r\nb', lineEndings: 'crlf' },
      { timestamp: '2026-10-15T04:20:22.302Z', offset: 3, old: '', new: 'c' },
      { timestamp: '2026-10-15T04:20:22.302Z', offset: 4, old: '', new: 'd' }
    ]);
    expect('lineEndings' in deltas[1]).toBe(false);
  });
});

/**
 * The documents a replay produces, one per step: what the assertions below read
 * as `texts`. The step's own offset is checked separately.
 */
const textsOf = (
  base: string,
  deltas: Parameters<typeof replaySteps>[1],
  lineEndings?: Parameters<typeof replaySteps>[2]
) => replaySteps(base, deltas, lineEndings).map((step) => step.text);

describe('replaySteps', () => {
  it('returns the base plus one text per step', () => {
    const texts = textsOf('', [
      { offset: 0, old: '', new: 'a', lineEndings: 'lf' },
      { offset: 1, old: '', new: 'b', lineEndings: 'lf' }
    ]);

    expect(texts).toEqual(['', 'a', 'ab']);
  });

  it('replaces and deletes per the reported span', () => {
    const texts = textsOf('abcdef', [
      { offset: 2, old: 'cd', new: 'XY', lineEndings: 'lf' },
      { offset: 0, old: 'a', new: '', lineEndings: 'lf' }
    ]);

    expect(texts).toEqual(['abcdef', 'abXYef', 'bXYef']);
  });

  it('clamps an offset past the end of the buffer to it', () => {
    const texts = textsOf('abc', [{ offset: 99, old: '', new: '!', lineEndings: 'lf' }]);

    expect(texts[1]).toBe('abc!');
  });

  it('applies the seeded session edits to its slot document', () => {
    const deltas: TextEdit[] = [
      { offset: 77, old: ';', new: '', lineEndings: 'lf' },
      { offset: 158, old: '', new: '\n    ', lineEndings: 'lf' },
      { offset: 163, old: '', new: '\n    ', lineEndings: 'lf' },
      { offset: 159, old: '\n   ', new: '', lineEndings: 'lf' },
      { offset: 164, old: '', new: 'p', lineEndings: 'lf' },
      { offset: 165, old: '', new: 'r', lineEndings: 'lf' },
      { offset: 165, old: 'r', new: '', lineEndings: 'lf' }
    ];

    const texts = textsOf(BASE_CODE, deltas);

    expect(texts).toHaveLength(deltas.length + 1);
    expect(texts.map((text) => text.length)).toEqual([247, 246, 251, 256, 252, 253, 254, 253]);
    expect(texts[1]).toBe(BASE_CODE.slice(0, 77) + BASE_CODE.slice(78));
  });

  it('reads a CRLF base as LF and applies edits in that same LF frame', () => {
    const texts = textsOf('int main() {\r\n    return 0;\r\n}\r\n', [
      { offset: 24, old: '0', new: '1', lineEndings: 'lf' }
    ]);

    expect(texts).toEqual(['int main() {\n    return 0;\n}\n', 'int main() {\n    return 1;\n}\n']);
  });

  it('reads a CRLF insertion as LF', () => {
    const texts = textsOf('ab', [{ offset: 1, old: 'b', new: 'b\r\nc', lineEndings: 'lf' }]);

    expect(texts).toEqual(['ab', 'ab\nc']);
  });
});

describe('replayBase', () => {
  it('is the empty string without a document', () => {
    expect(replayBase(null)).toBe('');
  });

  it('is the assembled template for a slot problem', () => {
    const document: SessionLogDocument = {
      template: '%slot s1%\n%endslot s1%\n',
      usesSlots: true,
      baseCode: 'assembled',
      savedCode: 'assembled',
      slots: SLOTS
    };

    expect(replayBase(document)).toBe('assembled');
  });

  it('is the starter code for a non-slot problem, whose base code is empty', () => {
    const document: SessionLogDocument = {
      template: 'int main() {}\n',
      usesSlots: false,
      baseCode: '',
      savedCode: 'int main() {}\n',
      slots: []
    };

    expect(replayBase(document)).toBe('int main() {}\n');
  });

  it('starts a non-slot replay from the starter code and lands on the saved body', () => {
    const document: SessionLogDocument = {
      template: 'int main() {}\n',
      usesSlots: false,
      baseCode: '',
      savedCode: 'int main() { return 0; }\n',
      slots: []
    };

    const texts = textsOf(replayBase(document), [{ offset: 12, old: '', new: ' return 0; ', lineEndings: 'lf' }]);

    expect(texts).toEqual(['int main() {}\n', 'int main() { return 0; }\n']);
  });
});

describe('slotAt', () => {
  it('names the slot holding the offset', () => {
    expect(slotAt(SLOTS, BASE_CODE, 77)).toBe('s1');
    expect(slotAt(SLOTS, BASE_CODE, 158)).toBe('s2');
  });

  it('reports an offset outside every slot as null', () => {
    expect(slotAt(SLOTS, BASE_CODE, 0)).toBeNull();
    expect(slotAt(SLOTS, BASE_CODE, BASE_CODE.length)).toBeNull();
    expect(slotAt(SLOTS, BASE_CODE, BASE_CODE.length + 1)).toBeNull();
    expect(slotAt(SLOTS, BASE_CODE, -1)).toBeNull();
  });
});

describe('legacyLineEndings', () => {
  it('is crlf for an unmarked recording whose inserted text carries \r\n', () => {
    expect(legacyLineEndings([{ offset: 0, old: '', new: 'a\r\nb' }])).toBe('crlf');
  });

  it('is lf for an unmarked recording that never inserted a line break', () => {
    expect(legacyLineEndings([{ offset: 0, old: '', new: 'ab' }])).toBe('lf');
    expect(legacyLineEndings([])).toBe('lf');
  });

  it('ignores deltas that recorded their own frame', () => {
    // A tagged recording's framework is stated per delta, so the fallback it
    // leaves behind is never read — a CRLF-looking insertion under an LF tag
    // must not drag legacy entries into the other frame.
    expect(legacyLineEndings([{ offset: 0, old: '', new: 'a\r\nb', lineEndings: 'lf' }])).toBe('lf');
  });
});

describe('replaySteps under the crlf assumption', () => {
  it('applies a raw offset to the buffer those offsets were counted over', () => {
    // The buffer is CRLF, so the edit at raw 25 replaces the `0` there; read in
    // LF coordinates that character sits at 24 instead.
    const steps = replaySteps('int main() {\r\n    return 0;\r\n}\r\n', [{ offset: 25, old: '0', new: '1' }], 'crlf');

    expect(steps.map((step) => step.text)).toEqual([
      'int main() {\n    return 0;\n}\n',
      'int main() {\n    return 1;\n}\n'
    ]);
    // The recorded offset is raw; the step reports it in the text it returned.
    expect(steps[1].offset).toBe(24);
  });

  it('finds the recorded old span in the CRLF buffer, so the whole deletion goes', () => {
    // `old` names the LF text it removed, so the raw span is that text expanded:
    // two LF characters are three raw ones. Deleting the LF length instead left
    // the `b` behind — this case used to assert that leftover as correct.
    const steps = replaySteps('a\r\nb\r\nc', [{ offset: 1, old: '\nb', new: '' }], 'crlf');

    expect(steps.at(-1)?.text).toBe('a\nc');
    expect(steps.at(-1)?.approximate).toBe(false);
  });

  it('leaves an edit with no recorded span unapplied, which is all the log can say', () => {
    const steps = replaySteps('ab', [{ offset: 1, old: '', new: '' }], 'crlf');

    expect(steps.at(-1)?.text).toBe('ab');
  });
});

describe('replaySteps with a frame per delta', () => {
  it('switches frames mid-recording without re-reading the earlier edits', () => {
    // A session spanning the recorder's LF normalization: the legacy delta's
    // offset is a raw CRLF one, the tagged delta's is an LF one, and each is
    // read in its own frame against the same running document.
    const steps = replaySteps(
      'a\nb',
      [
        { offset: 3, old: '', new: 'X' },
        { offset: 3, old: '', new: 'Y', lineEndings: 'lf' }
      ],
      'crlf'
    );

    expect(steps.at(-1)?.text).toBe('a\nXYb');
  });

  it('reconstructs a legacy CRLF deletion exactly', () => {
    // `old` carries the two-character line break the CRLF editor counted.
    const steps = replaySteps('a\nb', [{ offset: 1, old: '\r\n', new: '\r\nX' }], 'crlf');

    expect(steps.at(-1)?.text).toBe('a\nXb');
    expect(steps.at(-1)?.approximate).toBe(false);
  });

  it('marks a legacy LF edit that touches a line break as approximate', () => {
    // Nothing recorded the frame, and an offset past the first line break could
    // be one character off — the log cannot say, so the pane admits it.
    const steps = replaySteps('a\nb', [{ offset: 3, old: '', new: 'X' }]);

    expect(steps.at(-1)?.text).toBe('a\nbX');
    expect(steps.at(-1)?.approximate).toBe(true);
  });

  it('leaves a single-line legacy edit before any line break exact', () => {
    const steps = replaySteps('ab\ncd', [{ offset: 1, old: '', new: 'X' }]);

    expect(steps.at(-1)?.text).toBe('aXb\ncd');
    expect(steps.at(-1)?.approximate).toBe(false);
  });
});

describe('codeSnapshots', () => {
  it('takes the code a run logged, counted to the edits before it', () => {
    const snapshots = codeSnapshots([
      entry('TEXT_MODIFIED', { offset: 0, old: '', new: 'a' }),
      entry('RUN_ATTEMPT', { runType: 'run', submittedCode: 'abc' }),
      entry('TEXT_MODIFIED', { offset: 3, old: '', new: 'd' }),
      entry('CUSTOM_RUN', { execution: { submittedCode: 'abcd' } })
    ]);

    expect(snapshots).toEqual([
      { beforeEdit: 1, code: 'abc' },
      { beforeEdit: 2, code: 'abcd' }
    ]);
  });

  it('skips entries whose payload carries no code', () => {
    expect(codeSnapshots([entry('RUN_ATTEMPT', { runType: 'run' }), entry('RUN_ATTEMPT', null)])).toEqual([]);
  });

  it('takes a periodic checkpoint as a full snapshot of the edits before it', () => {
    // The recorder writes these itself every 50 frames; the payload is the same
    // shape a run uses, so no extra case is needed to anchor a replay on one.
    const snapshots = codeSnapshots([
      entry('TEXT_MODIFIED', { offset: 0, old: '', new: 'a' }),
      entry('TEXT_MODIFIED', { offset: 1, old: '', new: 'b' }),
      entry('CODE_SNAPSHOT', { submittedCode: 'abc' }),
      entry('TEXT_MODIFIED', { offset: 3, old: '', new: 'd' })
    ]);

    expect(snapshots).toEqual([{ beforeEdit: 2, code: 'abc' }]);
  });
});

describe('replaySteps with snapshots', () => {
  it('restarts the document from a snapshot, dropping an earlier drift', () => {
    // The second delta is a deletion whose span the log lost (`old` empty), which
    // leaves a character behind — the drift a snapshot cures.
    const deltas: TextEdit[] = [
      { offset: 0, old: '', new: 'ab', lineEndings: 'lf' },
      { offset: 1, old: '', new: '', lineEndings: 'lf' },
      { offset: 2, old: '', new: '!', lineEndings: 'lf' }
    ];
    const steps = replaySteps('', deltas, 'lf', [{ beforeEdit: 2, code: 'ab' }]);

    expect(steps.map((step) => step.text)).toEqual(['', 'ab', 'ab', 'ab!']);
    expect(steps[2].approximate).toBe(false);
  });

  it('flags a lost span as approximate until a snapshot proves the document', () => {
    const deltas: TextEdit[] = [
      { offset: 0, old: '', new: 'ab', lineEndings: 'lf' },
      { offset: 1, old: '', new: '', lineEndings: 'lf' },
      { offset: 2, old: '', new: 'c', lineEndings: 'lf' }
    ];
    const steps = replaySteps('', deltas, 'lf', [{ beforeEdit: 3, code: 'ac' }]);

    expect(steps.map((step) => step.approximate)).toEqual([false, false, true, false]);
  });

  it('flags an old that does not match the text it claims to replace', () => {
    // A recording whose `old` came from somewhere else: nothing verifies, so the
    // document cannot be trusted from that step on.
    const steps = replaySteps('abc', [{ offset: 0, old: 'zz', new: 'a', lineEndings: 'lf' }], 'lf');

    expect(steps[1].approximate).toBe(true);
  });
});
