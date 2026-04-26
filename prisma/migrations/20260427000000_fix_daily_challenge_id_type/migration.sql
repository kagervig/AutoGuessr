-- Fix DailyChallenge.id type mismatch.
-- The original 20260423194338 migration was applied to production with TEXT/CUID ids,
-- then later rewritten in-place to use SERIAL. This migration drops and recreates the
-- table and the GameSession.dailyChallengeId FK column with the correct INTEGER types.
-- Existing daily challenge rows are dev-only and intentionally discarded.

-- Drop existing FK and column on GameSession
ALTER TABLE "GameSession" DROP CONSTRAINT IF EXISTS "GameSession_dailyChallengeId_fkey";
ALTER TABLE "GameSession" DROP COLUMN IF EXISTS "dailyChallengeId";

-- Drop DailyChallenge table (data is regenerable)
DROP TABLE IF EXISTS "DailyChallenge";

-- Recreate DailyChallenge with SERIAL id
CREATE TABLE "DailyChallenge" (
    "id" SERIAL NOT NULL,
    "challengeNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "imageIds" TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "curatedBy" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyChallenge_challengeNumber_key" ON "DailyChallenge"("challengeNumber");
CREATE UNIQUE INDEX "DailyChallenge_date_key" ON "DailyChallenge"("date");

-- Re-add dailyChallengeId on GameSession as INTEGER
ALTER TABLE "GameSession" ADD COLUMN "dailyChallengeId" INTEGER;
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_dailyChallengeId_fkey" FOREIGN KEY ("dailyChallengeId") REFERENCES "DailyChallenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
