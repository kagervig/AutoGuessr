-- AlterTable
ALTER TABLE "GameSession" ADD COLUMN     "dailyChallengeId" TEXT;

-- CreateTable
CREATE TABLE "DailyChallenge" (
    "id" TEXT NOT NULL,
    "challengeNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "imageIds" TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "curatedBy" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyChallenge_challengeNumber_key" ON "DailyChallenge"("challengeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DailyChallenge_date_key" ON "DailyChallenge"("date");

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_dailyChallengeId_fkey" FOREIGN KEY ("dailyChallengeId") REFERENCES "DailyChallenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
