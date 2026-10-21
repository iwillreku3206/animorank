import { describe, expect, it } from 'vitest';
import type { JsonValue } from '@zenstackhq/orm';
import type { SessionLogEntry, SessionLogSlot } from '$lib/analytics/sessionLogView';
import { replayTexts, slotAt, textDeltas } from './replay';

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
});

describe('replayTexts', () => {
  it('returns the base plus one text per step', () => {
    const texts = replayTexts('', [
      { timestamp: 't1', offset: 0, old: '', new: 'a' },
      { timestamp: 't2', offset: 1, old: '', new: 'b' }
    ]);

    expect(texts).toEqual(['', 'a', 'ab']);
  });

  it('replaces and deletes per the reported span', () => {
    const texts = replayTexts('abcdef', [
      { timestamp: 't1', offset: 2, old: 'cd', new: 'XY' },
      { timestamp: 't2', offset: 0, old: 'a', new: '' }
    ]);

    expect(texts).toEqual(['abcdef', 'abXYef', 'bXYef']);
  });

  it('clamps an offset past the end of the buffer to it', () => {
    const texts = replayTexts('abc', [{ timestamp: 't1', offset: 99, old: '', new: '!' }]);

    expect(texts[1]).toBe('abc!');
  });

  it('applies the seeded session edits to its slot document', () => {
    const deltas = [
      { timestamp: 't1', offset: 77, old: ';', new: '' },
      { timestamp: 't2', offset: 158, old: '', new: '\n    ' },
      { timestamp: 't3', offset: 163, old: '', new: '\n    ' },
      { timestamp: 't4', offset: 159, old: '\n   ', new: '' },
      { timestamp: 't5', offset: 164, old: '', new: 'p' },
      { timestamp: 't6', offset: 165, old: '', new: 'r' },
      { timestamp: 't7', offset: 165, old: 'r', new: '' }
    ];

    const texts = replayTexts(BASE_CODE, deltas);

    expect(texts).toHaveLength(deltas.length + 1);
    expect(texts.map((text) => text.length)).toEqual([247, 246, 251, 256, 252, 253, 254, 253]);
    expect(texts[1]).toBe(BASE_CODE.slice(0, 77) + BASE_CODE.slice(78));
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
