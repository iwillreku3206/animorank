/*
  Warnings:

  - Made the column `data` on table `ProblemTestCase` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Problem" ADD COLUMN     "extension_data" JSONB NOT NULL DEFAULT '{}';

-- The flatten migration only sets `data` for rows with a matching child row,
-- so a legacy orphan row can still hold NULL; the column is required below.
UPDATE "ProblemTestCase" SET "data" = '{}'::jsonb WHERE "data" IS NULL;

-- AlterTable
ALTER TABLE "ProblemTestCase" ALTER COLUMN "data" SET NOT NULL;
