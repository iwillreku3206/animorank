/*
  Warnings:

  - Made the column `data` on table `ProblemTestCase` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Problem" ADD COLUMN     "extension_data" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "ProblemTestCase" ALTER COLUMN "data" SET NOT NULL;
