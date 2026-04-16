-- AlterTable
ALTER TABLE "ImageStats" ADD COLUMN     "correctRatio" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "totalServes" INTEGER NOT NULL DEFAULT 0;

-- BackfillTotalServes
UPDATE "ImageStats"
SET "totalServes" = "correctGuesses" + "incorrectGuesses";

-- BackfillCorrectRatio
UPDATE "ImageStats"
SET "correctRatio" = CASE
  WHEN ("correctGuesses" + "incorrectGuesses") = 0 THEN 1.0
  ELSE CAST("correctGuesses" AS FLOAT) / ("correctGuesses" + "incorrectGuesses")
END;

-- CreateIndex
CREATE INDEX "ImageStats_totalServes_idx" ON "ImageStats"("totalServes");

-- RenameForeignKey
ALTER TABLE "Round" RENAME CONSTRAINT "Round_sessionId_fkey" TO "Round_gameId_fkey";
