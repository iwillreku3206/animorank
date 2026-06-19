/*
  Drops the unused `color` column from the Tag table and the now-orphaned
  TagColor enum.

  `color` exists only on the base "Tag" table — the subtype tables
  (SubjectTag / DifficultyTag / TopicTag) carry just `id` + relations — so this
  deletes no rows and changes no other table. Postgres runs DDL in a
  transaction, so this is all-or-nothing.

  This migration is hand-authored (reviewed) rather than auto-generated to
  guarantee it contains only the two intended statements.
*/

-- AlterTable
ALTER TABLE "Tag" DROP COLUMN "color";

-- DropEnum
DROP TYPE "TagColor";
