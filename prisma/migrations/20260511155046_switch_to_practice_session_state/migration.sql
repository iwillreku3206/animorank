/*
  Warnings:

  - You are about to drop the column `previous_code` on the `PracticeSession` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PracticeSession" DROP COLUMN "previous_code",
ADD COLUMN     "previous_state" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "Problem" ADD COLUMN     "uses_slots" BOOLEAN NOT NULL DEFAULT false;

-- DropEnum
DROP TYPE "BaseType";

-- DropEnum
DROP TYPE "SizeModifier";
