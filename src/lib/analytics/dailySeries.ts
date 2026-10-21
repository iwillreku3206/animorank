export type DayCount = { day: string; count: number };
export type DailyPoint = { day: string; count: number; total: number };

/**
 * Shifts a `YYYY-MM-DD` day by whole days, staying in UTC so a DST transition
 * can never move the result onto the previous or next calendar day.
 */
export function addDays(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/**
 * Expands sparse per-day counts into one point per calendar day of
 * `[startDay, endDay]`, zero-filling gaps and running a cumulative total from
 * `baseline` (the count accumulated before `startDay`).
 */
export function fillDailySeries(rows: DayCount[], startDay: string, endDay: string, baseline = 0): DailyPoint[] {
  if (startDay > endDay) return [];
  const byDay: Record<string, number> = Object.fromEntries(rows.map((r) => [r.day, r.count]));
  const points: DailyPoint[] = [];
  let running = baseline;
  for (let day = startDay; day <= endDay; day = addDays(day, 1)) {
    const count = byDay[day] ?? 0;
    running += count;
    points.push({ day, count, total: running });
  }
  return points;
}
