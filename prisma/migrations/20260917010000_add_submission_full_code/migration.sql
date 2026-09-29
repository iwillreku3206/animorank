/*
  Warnings:

  - Added the required column `full_code` to the `Submission` table without a
    default value.

  Rows written before this column existed hold only the student's editable
  sections, never the assembled program. They cannot be reconstructed faithfully
  once a problem's `starter_code` is edited, and a guessed reconstruction beside
  a real verdict is worse than no row at all. Every such row was test data
  predating the feature's release, so they are removed rather than backfilled.

*/
-- DeleteData
-- Intentional and irreversible: see the note above. This clears only rows
-- recorded before `full_code` existed, which predate the feature's release.
DELETE FROM "Submission";

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "full_code" TEXT NOT NULL;
