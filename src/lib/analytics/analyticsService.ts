import { db } from '$lib/zenstack';
import { addDays, fillDailySeries, type DayCount } from './dailySeries';

export type DashboardRange = '30' | '90' | 'all';

export interface DashboardPoint {
  day: string;
  value: number;
}

export interface DashboardData {
  range: DashboardRange;
  totalUsers: number;
  signups: DashboardPoint[];
  cumulative: DashboardPoint[];
  sessions: DashboardPoint[];
}

const RANGES: readonly DashboardRange[] = ['30', '90', 'all'];

export class AnalyticsService {
  /**
   * Everything the analytics dashboard shows: the user total plus three daily
   * series over the selected range.
   *
   * Buckets are UTC calendar days. `User.createdAt` is a timestamp without time
   * zone holding UTC, so it is bucketed as-is; `PracticeSession.created_at` is a
   * timestamptz and is normalized to UTC explicitly. `date_trunc`/`to_char`
   * grouping has no ORM equivalent, hence the raw SQL.
   */
  public async getDashboard(rangeParam: string | null): Promise<DashboardData> {
    const range: DashboardRange = RANGES.includes(rangeParam as DashboardRange)
      ? (rangeParam as DashboardRange)
      : 'all';
    const endDay = new Date().toISOString().slice(0, 10);
    const windowStart = range === 'all' ? null : addDays(endDay, -(Number(range) - 1));

    const [totalUsers, signupRows, sessionRows] = await Promise.all([
      db.user.count(),
      windowStart
        ? db.$queryRaw<DayCount[]>`
            SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day,
                   COUNT(*)::int AS count
            FROM "User"
            WHERE "createdAt" >= ${windowStart}
            GROUP BY 1 ORDER BY 1`
        : db.$queryRaw<DayCount[]>`
            SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day,
                   COUNT(*)::int AS count
            FROM "User"
            GROUP BY 1 ORDER BY 1`,
      windowStart
        ? db.$queryRaw<DayCount[]>`
            SELECT to_char(date_trunc('day', "created_at" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
                   COUNT(*)::int AS count
            FROM "PracticeSession"
            WHERE "created_at" >= ${windowStart}
            GROUP BY 1 ORDER BY 1`
        : db.$queryRaw<DayCount[]>`
            SELECT to_char(date_trunc('day', "created_at" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
                   COUNT(*)::int AS count
            FROM "PracticeSession"
            GROUP BY 1 ORDER BY 1`
    ]);

    // The cumulative line continues from the users already present before the
    // window; over all time there is no such baseline.
    const baseline = windowStart
      ? await db.user.count({
          where: { createdAt: { lt: new Date(`${windowStart}T00:00:00.000Z`) } }
        })
      : 0;

    const signupStart = windowStart ?? signupRows[0]?.day ?? endDay;
    const userPoints =
      signupRows.length || windowStart ? fillDailySeries(signupRows, signupStart, endDay, baseline) : [];
    const sessionStart = windowStart ?? sessionRows[0]?.day ?? endDay;
    const sessionPoints = sessionRows.length || windowStart ? fillDailySeries(sessionRows, sessionStart, endDay) : [];

    return {
      range,
      totalUsers,
      signups: userPoints.map((p) => ({ day: p.day, value: p.count })),
      cumulative: userPoints.map((p) => ({ day: p.day, value: p.total })),
      sessions: sessionPoints.map((p) => ({ day: p.day, value: p.count }))
    };
  }
}
