/*
  Warnings:

  - All tags will be dropped by this migration.
  - You are about to drop the column `color` on the `DifficultyTag` table. All the data in the column will be lost.
  - You are about to drop the column `label` on the `DifficultyTag` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `DifficultyTag` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `DifficultyTag` table. All the data in the column will be lost.
  - You are about to drop the column `color` on the `SubjectTag` table. All the data in the column will be lost.
  - You are about to drop the column `label` on the `SubjectTag` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `SubjectTag` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `SubjectTag` table. All the data in the column will be lost.
  - You are about to drop the column `color` on the `TopicTag` table. All the data in the column will be lost.
  - You are about to drop the column `label` on the `TopicTag` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `TopicTag` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `TopicTag` table. All the data in the column will be lost.

*/

DELETE FROM "SubjectTag";
DELETE FROM "DifficultyTag";
DELETE FROM "TopicTag";

-- DropIndex
DROP INDEX "DifficultyTag_label_key";

-- DropIndex
DROP INDEX "SubjectTag_label_key";

-- DropIndex
DROP INDEX "TopicTag_label_key";

-- AlterTable
ALTER TABLE "DifficultyTag" DROP COLUMN "color",
DROP COLUMN "label",
DROP COLUMN "order",
DROP COLUMN "type";

-- AlterTable
ALTER TABLE "SubjectTag" DROP COLUMN "color",
DROP COLUMN "label",
DROP COLUMN "order",
DROP COLUMN "type";

-- AlterTable
ALTER TABLE "TopicTag" DROP COLUMN "color",
DROP COLUMN "label",
DROP COLUMN "order",
DROP COLUMN "type";

-- CreateTable
CREATE TABLE "Tag" (
    "id" UUID NOT NULL,
    "type" "TagType" NOT NULL,
    "color" "TagColor" NOT NULL DEFAULT 'default',
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_label_key" ON "Tag"("label");

-- AddForeignKey
ALTER TABLE "SubjectTag" ADD CONSTRAINT "SubjectTag_id_fkey" FOREIGN KEY ("id") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DifficultyTag" ADD CONSTRAINT "DifficultyTag_id_fkey" FOREIGN KEY ("id") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicTag" ADD CONSTRAINT "TopicTag_id_fkey" FOREIGN KEY ("id") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
