/*
  Adds the curated catalogue ordering column.

  `featured_rank` carries both the flag and the order: NULL means the set is not
  featured, and a non-NULL value is its position in the catalogue's default
  listing (lowest first). One column rather than a boolean plus an ordering
  column, so the two can never disagree.

  ProblemSetService.findByFilter orders by it only when the caller supplies no
  explicit sort — an explicit sort replaces it outright.

  No index: the catalogue query filters and sorts on several other columns, so
  Postgres would not use one, and the same reasoning already applies to the
  ILIKE search documented in findByFilter.

  Additive DDL only — no existing rows are changed, and every problem set
  starts unfeatured.

  Hand-authored rather than generated with `zen migrate dev` on purpose: the
  auto-diff emits DROP INDEX for `problemset_title_trgm` and
  `problemset_description_trgm` on every run, since the trgm index type is not
  expressible in the zmodel. See
  20260820000000_restore_problemset_trgm_indexes.
*/

-- AlterTable
ALTER TABLE "ProblemSet" ADD COLUMN     "featured_rank" INTEGER;
