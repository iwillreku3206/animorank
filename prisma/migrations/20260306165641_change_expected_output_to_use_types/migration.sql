/*
  Warnings:

  - The `expected_output` column on the `FunctionOutputTestCase` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "FunctionOutputTestCase" DROP COLUMN "expected_output",
ADD COLUMN     "expected_output" JSONB NOT NULL DEFAULT '{"base": "INT"}';
