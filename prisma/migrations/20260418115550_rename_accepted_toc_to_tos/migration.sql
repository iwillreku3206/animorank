/*
  Warnings:

  - You are about to drop the column `hasAcceptedTOC` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "hasAcceptedTOC",
ADD COLUMN     "hasAcceptedTOS" BOOLEAN NOT NULL DEFAULT false;
