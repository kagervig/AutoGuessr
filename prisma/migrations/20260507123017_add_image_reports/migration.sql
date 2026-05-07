-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ImageReport" (
    "id" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "certainty" INTEGER NOT NULL,
    "comment" TEXT,
    "suggestedMake" TEXT,
    "suggestedModel" TEXT,
    "suggestedYear" INTEGER,
    "suggestedTrim" TEXT,
    "suggestedCountryOfOrigin" TEXT,
    "suggestedBodyStyle" "BodyStyle",
    "suggestedEra" "Era",
    "suggestedRarity" "Rarity",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageReport_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ImageReport" ADD CONSTRAINT "ImageReport_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
