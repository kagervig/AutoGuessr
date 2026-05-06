-- CreateTable
CREATE TABLE "DailyChallengeSession" (
    "id" TEXT NOT NULL,
    "playerId" TEXT,
    "challengeId" INTEGER NOT NULL,
    "answerVehicleIds" TEXT[],
    "roundBonuses" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "roundScores" INTEGER[],
    "totalScore" INTEGER,

    CONSTRAINT "DailyChallengeSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyChallengeSession_playerId_challengeId_key" ON "DailyChallengeSession"("playerId", "challengeId");

-- CreateIndex
CREATE INDEX "DailyChallengeSession_challengeId_idx" ON "DailyChallengeSession"("challengeId");

-- AddForeignKey
ALTER TABLE "DailyChallengeSession" ADD CONSTRAINT "DailyChallengeSession_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "DailyChallenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyChallengeSession" ADD CONSTRAINT "DailyChallengeSession_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
