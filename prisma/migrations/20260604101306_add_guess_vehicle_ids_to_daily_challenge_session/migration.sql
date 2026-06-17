-- AlterTable
ALTER TABLE "DailyChallengeSession" ADD COLUMN     "guessVehicleIds" TEXT[];

-- CreateIndex
CREATE INDEX "ImageReport_imageId_idx" ON "ImageReport"("imageId");
