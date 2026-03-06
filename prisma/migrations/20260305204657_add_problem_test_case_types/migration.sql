/*
  Warnings:

  - The values [FUNCTION,PROGRAM] on the enum `ProblemTestCaseType` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `problem_id` to the `ProblemTestCase` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ProblemTestCaseType_new" AS ENUM ('FUNCTION_OUTPUT', 'PROGRAM_IO', 'CUSTOM');
ALTER TABLE "ProblemTestCase" ALTER COLUMN "type" TYPE "ProblemTestCaseType_new" USING ("type"::text::"ProblemTestCaseType_new");
ALTER TYPE "ProblemTestCaseType" RENAME TO "ProblemTestCaseType_old";
ALTER TYPE "ProblemTestCaseType_new" RENAME TO "ProblemTestCaseType";
DROP TYPE "public"."ProblemTestCaseType_old";
COMMIT;

-- AlterTable
ALTER TABLE "ProblemTestCase" ADD COLUMN     "problem_id" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "ProblemTestCase" ADD CONSTRAINT "ProblemTestCase_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
