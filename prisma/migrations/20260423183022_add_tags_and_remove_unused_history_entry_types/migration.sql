/*
  Warnings:

  - The values [TEXT_INSERT,TEXT_DELETE,TEXT_PASTE,TEXT_UNDO,TEXT_REDO,SUBMIT_ATTEMPT] on the enum `HistoryEntryType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "TagType" AS ENUM ('subject', 'difficulty', 'topic');

-- CreateEnum
CREATE TYPE "TagColor" AS ENUM ('default', 'red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink');

-- AlterEnum
BEGIN;
CREATE TYPE "HistoryEntryType_new" AS ENUM ('TEXT_MODIFIED', 'PAGE_OPENED', 'PAGE_FOCUS', 'RUN_ATTEMPT', 'PING', 'OTHER');
ALTER TABLE "PracticeHistoryEntry" ALTER COLUMN "type" TYPE "HistoryEntryType_new" USING ("type"::text::"HistoryEntryType_new");
ALTER TYPE "HistoryEntryType" RENAME TO "HistoryEntryType_old";
ALTER TYPE "HistoryEntryType_new" RENAME TO "HistoryEntryType";
DROP TYPE "public"."HistoryEntryType_old";
COMMIT;

-- CreateTable
CREATE TABLE "Tag" (
    "id" UUID NOT NULL,
    "type" "TagType" NOT NULL,
    "color" "TagColor" NOT NULL DEFAULT 'default',
    "label" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProblemToTag" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ProblemToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProblemSetToTag" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ProblemSetToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_label_key" ON "Tag"("label");

-- CreateIndex
CREATE INDEX "_ProblemToTag_B_index" ON "_ProblemToTag"("B");

-- CreateIndex
CREATE INDEX "_ProblemSetToTag_B_index" ON "_ProblemSetToTag"("B");

-- AddForeignKey
ALTER TABLE "_ProblemToTag" ADD CONSTRAINT "_ProblemToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProblemToTag" ADD CONSTRAINT "_ProblemToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProblemSetToTag" ADD CONSTRAINT "_ProblemSetToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "ProblemSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProblemSetToTag" ADD CONSTRAINT "_ProblemSetToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
