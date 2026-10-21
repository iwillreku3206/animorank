import { describe, expect, it } from 'vitest';
import { addDays, fillDailySeries } from './dailySeries';

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('fillDailySeries', () => {
  it('zero-fills gaps and accumulates from the baseline', () => {
    const points = fillDailySeries(
      [
        { day: '2026-05-02', count: 2 },
        { day: '2026-05-04', count: 3 }
      ],
      '2026-05-01',
      '2026-05-04',
      5
    );

    expect(points).toEqual([
      { day: '2026-05-01', count: 0, total: 5 },
      { day: '2026-05-02', count: 2, total: 7 },
      { day: '2026-05-03', count: 0, total: 7 },
      { day: '2026-05-04', count: 3, total: 10 }
    ]);
  });

  it('rolls over month boundaries', () => {
    const points = fillDailySeries([{ day: '2026-03-01', count: 1 }], '2026-02-27', '2026-03-01');
    expect(points.map((p) => p.day)).toEqual(['2026-02-27', '2026-02-28', '2026-03-01']);
    expect(points.map((p) => p.count)).toEqual([0, 0, 1]);
    expect(points.map((p) => p.total)).toEqual([0, 0, 1]);
  });

  it('emits a constant baseline over an empty window', () => {
    const points = fillDailySeries([], '2026-09-22', '2026-09-24', 6);
    expect(points).toEqual([
      { day: '2026-09-22', count: 0, total: 6 },
      { day: '2026-09-23', count: 0, total: 6 },
      { day: '2026-09-24', count: 0, total: 6 }
    ]);
  });

  it('returns nothing for an inverted window', () => {
    expect(fillDailySeries([{ day: '2026-05-02', count: 1 }], '2026-05-03', '2026-05-02')).toEqual([]);
  });
});
