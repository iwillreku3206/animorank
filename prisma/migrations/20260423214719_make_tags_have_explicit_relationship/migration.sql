/*
  Warnings:

  - You are about to drop the `_ProblemSetToTag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ProblemToTag` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ProblemSetToTag" DROP CONSTRAINT "_ProblemSetToTag_A_fkey";

-- DropForeignKey
ALTER TABLE "_ProblemSetToTag" DROP CONSTRAINT "_ProblemSetToTag_B_fkey";

-- DropForeignKey
ALTER TABLE "_ProblemToTag" DROP CONSTRAINT "_ProblemToTag_A_fkey";

-- DropForeignKey
ALTER TABLE "_ProblemToTag" DROP CONSTRAINT "_ProblemToTag_B_fkey";

-- DropTable
DROP TABLE "_ProblemSetToTag";

-- DropTable
DROP TABLE "_ProblemToTag";

-- CreateTable
CREATE TABLE "ProblemTag" (
    "problemId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "ProblemTag_pkey" PRIMARY KEY ("problemId","tagId")
);

-- CreateTable
CREATE TABLE "ProblemSetTag" (
    "problemSetId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "ProblemSetTag_pkey" PRIMARY KEY ("problemSetId","tagId")
);

-- AddForeignKey
ALTER TABLE "ProblemTag" ADD CONSTRAINT "ProblemTag_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTag" ADD CONSTRAINT "ProblemTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemSetTag" ADD CONSTRAINT "ProblemSetTag_problemSetId_fkey" FOREIGN KEY ("problemSetId") REFERENCES "ProblemSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemSetTag" ADD CONSTRAINT "ProblemSetTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
