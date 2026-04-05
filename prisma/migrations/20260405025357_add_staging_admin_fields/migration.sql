-- AlterTable
ALTER TABLE "StagingImage" ADD COLUMN     "adminCategories" TEXT[],
ADD COLUMN     "adminEra" TEXT,
ADD COLUMN     "adminIsHardcoreEligible" BOOLEAN,
ADD COLUMN     "adminRarity" TEXT,
ADD COLUMN     "adminRegionSlug" TEXT;
