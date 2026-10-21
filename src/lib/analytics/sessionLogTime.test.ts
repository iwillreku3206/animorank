import { describe, expect, it } from 'vitest';
import { formatLogTimestamp } from './sessionLogTime';

describe('formatLogTimestamp', () => {
  it('formats in UTC, so every reader sees the same instant', () => {
    // 04:20:22Z, not the 04:20 of a local clock west of UTC or the 12:20 east.
    expect(formatLogTimestamp('2026-10-15T04:20:22.302Z')).toBe('Oct 15, 2026, 4:20:22 AM');
  });

  it('reads a timestamp that crosses midnight as its own UTC day', () => {
    expect(formatLogTimestamp('2026-10-15T23:34:18.791Z')).toBe('Oct 15, 2026, 11:34:18 PM');
    expect(formatLogTimestamp('2026-10-16T00:00:00.000Z')).toBe('Oct 16, 2026, 12:00:00 AM');
  });
});
