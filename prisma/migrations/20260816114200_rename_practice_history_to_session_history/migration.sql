/*
  Warnings:

  - You are about to drop the `PracticeHistoryEntry` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PracticeHistoryEntry" DROP CONSTRAINT "PracticeHistoryEntry_practice_session_id_fkey";

-- DropTable
DROP TABLE "PracticeHistoryEntry";

-- DropEnum
DROP TYPE "HistoryEntryType";

-- CreateTable
CREATE TABLE "SessionHistoryEntry" (
    "id" UUID NOT NULL,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "practice_session_id" UUID NOT NULL,

    CONSTRAINT "SessionHistoryEntry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SessionHistoryEntry" ADD CONSTRAINT "SessionHistoryEntry_practice_session_id_fkey" FOREIGN KEY ("practice_session_id") REFERENCES "PracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
