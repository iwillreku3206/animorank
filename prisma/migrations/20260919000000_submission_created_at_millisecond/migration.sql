/*
  Narrows the submission history's cursor column to millisecond precision.

  `created_at` doubles as the keyset cursor for the history endpoint, and that
  cursor round trips through JSON. Both a JS `Date` and `toISOString()` stop at
  milliseconds, so at TIMESTAMPTZ(6) a row written at `.123456` reached the
  client as `.123`; the `created_at < :before` asking for the next page then
  failed to exclude it, and the boundary row was served on two consecutive
  pages. The keyed `{#each}` rendering that list throws on a duplicate id, so
  every press of "Load older submissions" broke the panel.

  Storing only what the wire can carry makes the cursor exact. The alternative
  -- comparing at full precision -- is not reachable from application code,
  since the driver materialises TIMESTAMPTZ as a millisecond JS `Date` on the
  way out and on the way back in.

  Deliberately out of step with the rest of the schema, which is uniformly
  TIMESTAMPTZ(6). See the field comment in src/zenstack/submission.zmodel.

  Existing values are rounded to the millisecond by the cast. That reorders
  nothing: the index is on (student_id, problem_id, created_at) and a student's
  submissions are separated by a judge0 round trip, never by microseconds.

  Hand-authored rather than generated with `zen migrate dev`, for the reason
  given in 20260918000000_add_problemset_featured_rank: the auto-diff emits
  DROP INDEX for the trgm indexes on every run.
*/

-- AlterTable
ALTER TABLE "Submission" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3);
