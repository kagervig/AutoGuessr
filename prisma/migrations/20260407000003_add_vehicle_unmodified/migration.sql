-- AlterTable
ALTER TABLE "Image" ADD COLUMN "isVehicleUnmodified" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "StagingImage" ADD COLUMN "adminIsVehicleUnmodified" BOOLEAN;
