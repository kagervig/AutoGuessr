-- AlterTable: add sessionToken with a per-row unique default for existing rows
ALTER TABLE "GameSession" ADD COLUMN "sessionToken" TEXT NOT NULL DEFAULT gen_random_uuid();

-- CreateIndex
CREATE UNIQUE INDEX "GameSession_sessionToken_key" ON "GameSession"("sessionToken");

-- AlterTable: rename column to avoid a drop+recreate that would lose data
ALTER TABLE "Round" RENAME COLUMN "sessionId" TO "gameId";
