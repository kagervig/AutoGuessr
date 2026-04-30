/*
  Warnings:

  - You are about to drop the column `challengeNumber` on the `DailyChallenge` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "DailyChallenge_challengeNumber_key";

-- AlterTable
ALTER TABLE "DailyChallenge" DROP COLUMN "challengeNumber";
