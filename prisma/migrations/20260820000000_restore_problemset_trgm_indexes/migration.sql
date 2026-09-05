/*
  Restores the ProblemSet trigram GIN indexes that
  20260708021600_flatten_test_case_schema silently dropped.

  The flatten migration was auto-generated from the zmodel, and the trgm
  index type is not expressible there, so Prisma's diff saw the hand-authored
  indexes (created in 20260701120000_add_problemset_trgm_indexes) as drift and
  emitted DROP INDEX for both. They back the still-active `ILIKE '%term%'`
  search in ProblemSetService.findByFilter; without them every problem-set
  search degrades to a sequential scan.

  DO NOT DROP OR EDIT these indexes in any future auto-generated migration:
  keep them out of the zmodel (they can't be represented there) and let the
  auto-diff DROP statements be discarded at review time. This migration is
  intentionally re-creatable (IF NOT EXISTS) so it also self-heals if a
  future migration drops them again.

  Hand-authored (reviewed), mirroring 20260701120000_add_problemset_trgm_indexes.
  Additive DDL only — no data is changed.
*/

-- CreateIndex
CREATE INDEX IF NOT EXISTS "problemset_title_trgm"
  ON "ProblemSet" USING gin ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "problemset_description_trgm"
  ON "ProblemSet" USING gin ("description" gin_trgm_ops);
