import { describe, expect, it } from 'vitest';
import type { SessionLogEntry } from './sessionLogView';
import { TYPE_COLORS, colorOf, typeColors } from './sessionLogColors';

describe('typeColors', () => {
  const at = (type: string, id: string, second: number): SessionLogEntry => ({
    id,
    timestamp: new Date(Date.UTC(2026, 9, 15, 4, 20, second)).toISOString(),
    type,
    data: null
  });

  it('hands a different colour to every type of one session', () => {
    const colors = typeColors([at('TEXT_MODIFIED', 'a', 0), at('RUN_ATTEMPT', 'b', 1), at('CLIVE_PHASE_OPEN', 'c', 2)]);

    expect([...colors.keys()]).toEqual(['TEXT_MODIFIED', 'RUN_ATTEMPT', 'CLIVE_PHASE_OPEN']);
    expect(new Set(colors.values()).size).toBe(3);
    expect([...colors.values()]).toEqual([TYPE_COLORS[0], TYPE_COLORS[1], TYPE_COLORS[2]]);
  });

  it('does not spend a colour on a type it has already seen', () => {
    const colors = typeColors([
      at('TEXT_MODIFIED', 'a', 0),
      at('RUN_ATTEMPT', 'b', 1),
      at('TEXT_MODIFIED', 'c', 2),
      at('RUN_ATTEMPT', 'd', 3)
    ]);

    expect(colors.size).toBe(2);
    expect(colors.get('TEXT_MODIFIED')).toBe(TYPE_COLORS[0]);
    expect(colors.get('RUN_ATTEMPT')).toBe(TYPE_COLORS[1]);
  });

  it('wraps past the end of the scale rather than leaving a type uncoloured', () => {
    const types = Array.from({ length: TYPE_COLORS.length + 2 }, (_, index) => `TYPE_${index}`);
    const colors = typeColors(types.map((type, index) => at(type, `id-${index}`, index)));

    expect(colors.size).toBe(types.length);
    expect(colors.get('TYPE_0')).toBe(TYPE_COLORS[0]);
    expect(colors.get(`TYPE_${TYPE_COLORS.length}`)).toBe(TYPE_COLORS[0]);
    expect(colors.get(`TYPE_${TYPE_COLORS.length + 1}`)).toBe(TYPE_COLORS[1]);
  });

  it('is empty for a session with no entries', () => {
    expect(typeColors([]).size).toBe(0);
  });

  it('has enough colours apart for the types a session can log, with no repeats', () => {
    // Nine types is what the seeded session logs; the scale keeps a spare.
    expect(TYPE_COLORS.length).toBeGreaterThanOrEqual(10);
    expect(new Set(TYPE_COLORS).size).toBe(TYPE_COLORS.length);
  });

  it("anchors on the theme's accent, so a re-themed build starts from its own colour", () => {
    expect(TYPE_COLORS[0]).toBe('var(--color-primary)');
    for (const color of TYPE_COLORS.slice(1)) expect(color).toMatch(/^oklch\([\d.]+ [\d.]+ [\d.]+\)$/);
  });
});

describe('colorOf', () => {
  it("answers a type's colour, and the inherited colour for one the session never recorded", () => {
    const colors = typeColors([
      {
        id: 'a',
        timestamp: '2026-10-15T04:20:22.302Z',
        type: 'RUN_ATTEMPT',
        data: null
      }
    ]);

    expect(colorOf(colors, 'RUN_ATTEMPT')).toBe(TYPE_COLORS[0]);
    expect(colorOf(colors, 'TEXT_MODIFIED')).toBe('currentColor');
  });
});
