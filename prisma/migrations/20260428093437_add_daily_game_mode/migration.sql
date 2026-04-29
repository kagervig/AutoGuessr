-- AlterEnum
ALTER TYPE "GameMode" ADD VALUE 'daily';

-- CreateIndex
CREATE INDEX "GameSession_dailyChallengeId_idx" ON "GameSession"("dailyChallengeId");
