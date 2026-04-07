-- AlterTable
ALTER TABLE "Image" ADD COLUMN "copyrightHolder" TEXT,
ADD COLUMN "isCropped" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isLogoVisible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isModelNameVisible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "hasMultipleVehicles" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "StagingImage" ADD COLUMN "adminCopyrightHolder" TEXT,
ADD COLUMN "adminIsCropped" BOOLEAN,
ADD COLUMN "adminIsLogoVisible" BOOLEAN,
ADD COLUMN "adminIsModelNameVisible" BOOLEAN,
ADD COLUMN "adminHasMultipleVehicles" BOOLEAN;
