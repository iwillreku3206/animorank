import { describe, expect, it } from 'vitest';
import type { JsonValue } from '@zenstackhq/orm';
import type { SessionLogEntry } from '$lib/analytics/sessionLogView';
import {
  FRAME_MS,
  MAX_SPEED,
  MIN_SPEED,
  SPEEDS,
  buildTape,
  formatElapsed,
  frameDuration,
  parseSpeed,
  previewOf,
  textEditCounts
} from './tape';

const entry = (id: string, timestamp: string, data: JsonValue | null = null): SessionLogEntry => ({
  id,
  timestamp,
  type: 'CLIVE_PHASE_OPEN',
  data
});

describe('buildTape', () => {
  it('starts the clock at the first entry and offsets the rest from it', () => {
    const tape = buildTape([
      entry('a', '2026-10-15T04:20:22.302Z'),
      entry('b', '2026-10-15T04:20:23.302Z'),
      entry('c', '2026-10-15T04:21:23.302Z')
    ]);

    expect(tape.map((frame) => frame.entry.id)).toEqual(['a', 'b', 'c']);
    expect(tape.map((frame) => frame.elapsedMs)).toEqual([0, 1000, 61000]);
  });

  it('reports a long gap as elapsed time rather than as extra frames', () => {
    const tape = buildTape([entry('a', '2026-10-15T04:20:22.302Z'), entry('b', '2026-10-16T04:20:22.302Z')]);

    expect(tape).toHaveLength(2);
    expect(tape[1].elapsedMs).toBe(86_400_000);
  });

  it('is empty for a session with no entries', () => {
    expect(buildTape([])).toEqual([]);
  });
});

describe('textEditCounts', () => {
  const at = (type: string, id: string, second: number): SessionLogEntry => ({
    id,
    timestamp: new Date(Date.UTC(2026, 9, 15, 4, 20, second)).toISOString(),
    type,
    data: null
  });

  it('counts a text edit on the frame it happens, and holds the count after', () => {
    const tape = buildTape([
      at('CLIVE_PHASE_OPEN', 'a', 0),
      at('TEXT_MODIFIED', 'b', 1),
      at('RUN_ATTEMPT', 'c', 2),
      at('TEXT_MODIFIED', 'd', 3)
    ]);

    expect(textEditCounts(tape)).toEqual([0, 1, 1, 2]);
  });

  it('stays at zero for a session with no text edits', () => {
    const tape = buildTape([at('CLIVE_PHASE_OPEN', 'a', 0), at('RUN_ATTEMPT', 'b', 1)]);

    expect(textEditCounts(tape)).toEqual([0, 0]);
  });

  it('has one count per frame, and none for an empty tape', () => {
    expect(textEditCounts(buildTape([]))).toEqual([]);
  });
});

describe('formatElapsed', () => {
  it('reads as a clock', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(9_000)).toBe('0:09');
    expect(formatElapsed(61_000)).toBe('1:01');
    expect(formatElapsed(3_599_000)).toBe('59:59');
    expect(formatElapsed(3_600_000)).toBe('1:00:00');
    expect(formatElapsed(3_723_000)).toBe('1:02:03');
  });

  it('never shows a negative clock', () => {
    expect(formatElapsed(-5_000)).toBe('0:00');
  });
});

describe('frameDuration', () => {
  it('speeds the frame up by the multiplier', () => {
    expect(SPEEDS).toContain(1);
    expect(frameDuration(1)).toBe(FRAME_MS);
    expect(frameDuration(4)).toBe(200);
    expect(frameDuration(0.5)).toBe(1600);
  });

  it('divides for a custom multiplier that is not a preset', () => {
    expect(frameDuration(1.5)).toBe(533);
    expect(frameDuration(6)).toBe(133);
  });

  it('clamps to the usable range, so the timer is never zero or unbounded', () => {
    expect(frameDuration(MIN_SPEED)).toBe(8000);
    expect(frameDuration(MAX_SPEED)).toBe(40);
    expect(frameDuration(1000)).toBe(frameDuration(MAX_SPEED));
    expect(frameDuration(0)).toBe(frameDuration(MIN_SPEED));
    expect(frameDuration(Number.NaN)).toBe(FRAME_MS);
  });
});

describe('parseSpeed', () => {
  it('reads a typed multiplier', () => {
    expect(parseSpeed('1.5')).toBe(1.5);
    expect(parseSpeed('4')).toBe(4);
    expect(parseSpeed(' 2 ')).toBe(2);
    expect(parseSpeed(String(MIN_SPEED))).toBe(MIN_SPEED);
    expect(parseSpeed(String(MAX_SPEED))).toBe(MAX_SPEED);
  });

  it('rejects text playback cannot use', () => {
    expect(parseSpeed('')).toBeNull();
    expect(parseSpeed('   ')).toBeNull();
    expect(parseSpeed('fast')).toBeNull();
    expect(parseSpeed('0')).toBeNull();
    expect(parseSpeed('-2')).toBeNull();
    expect(parseSpeed('0.05')).toBeNull();
    expect(parseSpeed('21')).toBeNull();
    expect(parseSpeed('Infinity')).toBeNull();
  });
});

describe('previewOf', () => {
  it('flattens the payload onto one line', () => {
    expect(previewOf({ via: 'track', phase: 'design' })).toBe('{"via":"track","phase":"design"}');
  });

  it('truncates a long payload', () => {
    const preview = previewOf({ note: 'x'.repeat(100) }, 20);

    expect(preview).toHaveLength(21);
    expect(preview.endsWith('…')).toBe(true);
  });

  it('has nothing to preview when the entry carries no payload', () => {
    expect(previewOf(null)).toBe('');
  });
});
