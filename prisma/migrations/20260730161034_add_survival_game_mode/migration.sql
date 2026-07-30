-- AlterEnum
ALTER TYPE "GameMode" ADD VALUE 'survival';

-- AlterTable
ALTER TABLE "GameSession" ADD COLUMN     "survivalStreak" INTEGER;
