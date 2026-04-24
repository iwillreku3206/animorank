/*
  Warnings:

  - The values [orange,cyan,purple,pink] on the enum `TagColor` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TagColor_new" AS ENUM ('default', 'red', 'yellow', 'green', 'blue');
ALTER TABLE "public"."Tag" ALTER COLUMN "color" DROP DEFAULT;
ALTER TABLE "Tag" ALTER COLUMN "color" TYPE "TagColor_new" USING ("color"::text::"TagColor_new");
ALTER TYPE "TagColor" RENAME TO "TagColor_old";
ALTER TYPE "TagColor_new" RENAME TO "TagColor";
DROP TYPE "public"."TagColor_old";
ALTER TABLE "Tag" ALTER COLUMN "color" SET DEFAULT 'default';
COMMIT;
