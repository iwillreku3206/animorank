/*
  Warnings:

  - You are about to drop the column `history` on the `PracticeSession` table. All the data in the column will be lost.
  - You are about to drop the column `last_state` on the `PracticeSession` table. All the data in the column will be lost.
  - Added the required column `previous_code` to the `PracticeSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PracticeSession" DROP COLUMN "history",
DROP COLUMN "last_state",
ADD COLUMN     "done" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "previous_code" TEXT NOT NULL;
