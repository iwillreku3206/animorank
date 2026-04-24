/*
  Warnings:

  - You are about to drop the column `order` on the `ProblemTag` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ProblemTag" DROP COLUMN "order";

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;
