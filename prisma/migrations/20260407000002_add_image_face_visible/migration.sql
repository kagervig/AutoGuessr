-- AlterTable
ALTER TABLE "Image" ADD COLUMN "isFaceVisible" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "StagingImage" ADD COLUMN "adminIsFaceVisible" BOOLEAN;
