/*
  Adds trigram GIN indexes to support the `ILIKE '%term%'` search in
  ProblemSetService.findByFilter.

  A leading-wildcard ILIKE cannot use a btree index and falls back to a
  sequential scan. The pg_trgm extension provides `gin_trgm_ops`, which indexes
  the trigrams of a text column so substring/ILIKE matches can use a bitmap
  index scan instead. Title and description are both searched, so both get an
  index. (Search terms shorter than 3 characters still can't use trigrams and
  will scan — acceptable.)

  This migration is hand-authored (reviewed) rather than auto-generated: the
  trgm index type isn't expressible in the zmodel, and we want only these
  intended statements. Additive DDL only — no data is changed.
*/

-- Enable trigram matching (no-op if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "problemset_title_trgm"
  ON "ProblemSet" USING gin ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "problemset_description_trgm"
  ON "ProblemSet" USING gin ("description" gin_trgm_ops);
