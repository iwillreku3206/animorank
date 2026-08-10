/*
  Warnings:

  - You are about to drop the `CustomTestCase` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FunctionOutputTestCase` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProgramIOTestCase` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `data` to the `ProblemTestCase` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `ProblemTestCase` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/

-- AlterTable
ALTER TABLE "ProblemTestCase"
ADD COLUMN "data" JSONB,
ADD COLUMN "tmp_type" TEXT;

-- Flatten the data

-- Function Output Test Case
UPDATE "ProblemTestCase"
SET "data" = (
	SELECT jsonb_build_object(
		'function_name', ftc."function_name",
		'parameters', ftc."parameters",
		'comparisons', ftc."comparisons",
		'return_type', ftc."return_type"
	)
	FROM "FunctionOutputTestCase" ftc
	WHERE "ProblemTestCase"."id" = ftc."id"
),
"tmp_type" = 'function_output'
WHERE "type" = 'FunctionOutputTestCase';

-- Program IO Test Case
UPDATE "ProblemTestCase" ptc
SET "data" = (
	SELECT jsonb_build_object(
		'input', iotc."input",
		'output', iotc."output"
	)
	FROM "ProgramIOTestCase" iotc
	WHERE ptc."id" = iotc."id"
),
"tmp_type" = 'stdio'
WHERE "type" = 'ProgramIOTestCase';

-- Custom Test Case
UPDATE "ProblemTestCase" ptc
SET "data" = (
	SELECT jsonb_build_object(
		'test_code', ctc."test_code"
	)
	FROM "CustomTestCase" ctc
	WHERE ptc."id" = ctc."id"
),
"tmp_type" = 'custom'
WHERE "type" = 'CustomTestCase';

-- DropForeignKey
ALTER TABLE "CustomTestCase" DROP CONSTRAINT "CustomTestCase_id_fkey";

-- DropForeignKey
ALTER TABLE "FunctionOutputTestCase" DROP CONSTRAINT "FunctionOutputTestCase_id_fkey";

-- DropForeignKey
ALTER TABLE "ProgramIOTestCase" DROP CONSTRAINT "ProgramIOTestCase_id_fkey";

-- DropIndex
DROP INDEX "problemset_description_trgm";

-- DropIndex
DROP INDEX "problemset_title_trgm";

ALTER TABLE "ProblemTestCase" DROP COLUMN "type",
ADD COLUMN  "type" TEXT;

UPDATE "ProblemTestCase"
SET "type" = "tmp_type";

ALTER TABLE "ProblemTestCase" DROP COLUMN "tmp_type",
ALTER COLUMN "type" SET NOT NULL;

-- DropTable
DROP TABLE "CustomTestCase";

-- DropTable
DROP TABLE "FunctionOutputTestCase";

-- DropTable
DROP TABLE "ProgramIOTestCase";

-- DropEnum
DROP TYPE "FunctionOutputTestCaseOperator";

-- DropEnum
DROP TYPE "ProblemTestCaseType";
