/*
  Warnings:

  - The values [TEXT_COPY] on the enum `HistoryEntryType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "HistoryEntryType_new" AS ENUM ('TEXT_INSERT', 'TEXT_DELETE', 'TEXT_PASTE', 'TEXT_UNDO', 'TEXT_REDO', 'PAGE_OPENED', 'PAGE_FOCUS', 'RUN_ATTEMPT', 'SUBMIT_ATTEMPT', 'PING', 'OTHER');
ALTER TABLE "PracticeHistoryEntry" ALTER COLUMN "type" TYPE "HistoryEntryType_new" USING ("type"::text::"HistoryEntryType_new");
ALTER TYPE "HistoryEntryType" RENAME TO "HistoryEntryType_old";
ALTER TYPE "HistoryEntryType_new" RENAME TO "HistoryEntryType";
DROP TYPE "public"."HistoryEntryType_old";
COMMIT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hasAcceptedTOC" BOOLEAN NOT NULL DEFAULT false;
