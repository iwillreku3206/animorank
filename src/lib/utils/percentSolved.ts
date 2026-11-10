/**
 * Whole-number completion percentage, 0–100.
 *
 * A problem set with no problems is 0 of 0 solved, which the naive
 * `(finished / total) * 100` turns into NaN — rendered as "NaN% progress" by the
 * cards that show it. Report 0 instead: nothing is solved, and there is nothing
 * to solve.
 */
export function percentSolved(finished: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((finished / total) * 100);
}
