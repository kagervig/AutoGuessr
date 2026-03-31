-- CreateEnum
CREATE TYPE "StagingStatus" AS ENUM ('PENDING_REVIEW', 'COMMUNITY_REVIEW', 'READY', 'PUBLISHED', 'REJECTED');

-- CreateTable
CREATE TABLE "StagingImage" (
    "id" TEXT NOT NULL,
    "cloudinaryPublicId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "attribution" TEXT,
    "aiMake" TEXT,
    "aiModel" TEXT,
    "aiYear" INTEGER,
    "aiBodyStyle" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "aiTaggedAt" TIMESTAMP(3),
    "adminMake" TEXT,
    "adminModel" TEXT,
    "adminYear" INTEGER,
    "adminTrim" TEXT,
    "adminBodyStyle" TEXT,
    "adminNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "confirmedMake" TEXT,
    "confirmedModel" TEXT,
    "confirmedYear" INTEGER,
    "confirmedTrim" TEXT,
    "status" "StagingStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "submittedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StagingImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityIdentification" (
    "id" TEXT NOT NULL,
    "stagingImageId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "suggestedMake" TEXT,
    "suggestedModel" TEXT,
    "suggestedYear" INTEGER,
    "suggestedTrim" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityIdentification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StagingImage_cloudinaryPublicId_key" ON "StagingImage"("cloudinaryPublicId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityIdentification_stagingImageId_username_key" ON "CommunityIdentification"("stagingImageId", "username");

-- AddForeignKey
ALTER TABLE "CommunityIdentification" ADD CONSTRAINT "CommunityIdentification_stagingImageId_fkey" FOREIGN KEY ("stagingImageId") REFERENCES "StagingImage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
