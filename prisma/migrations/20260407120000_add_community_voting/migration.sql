-- AlterTable
ALTER TABLE "CommunityIdentification" ADD COLUMN "upvotes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CommunityIdentification" ADD COLUMN "downvotes" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CommunityVote" (
    "id" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "isUpvote" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityVote_suggestionId_username_key" ON "CommunityVote"("suggestionId", "username");

-- AddForeignKey
ALTER TABLE "CommunityVote" ADD CONSTRAINT "CommunityVote_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "CommunityIdentification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
