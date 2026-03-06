-- AlterTable
ALTER TABLE "Problem" ADD COLUMN     "starter_code" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "language" SET DEFAULT 'C';
