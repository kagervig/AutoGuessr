-- AlterTable
ALTER TABLE "GameSession" ADD COLUMN     "featuredVehicleIdAtStart" TEXT;

-- AlterTable
ALTER TABLE "Guess" ADD COLUMN     "dailyDiscoveryBonus" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "VehicleTrivia" (
    "vehicleId" TEXT NOT NULL,
    "displayModel" TEXT,
    "productionYears" TEXT NOT NULL,
    "engine" TEXT,
    "layout" TEXT,
    "regionalNames" TEXT,
    "funFacts" TEXT[],
    "sourceModel" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedByAdmin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "VehicleTrivia_pkey" PRIMARY KEY ("vehicleId")
);

-- CreateTable
CREATE TABLE "FeaturedVehicleOfDay" (
    "date" TIMESTAMP(3) NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "curatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeaturedVehicleOfDay_pkey" PRIMARY KEY ("date")
);

-- AddForeignKey
ALTER TABLE "VehicleTrivia" ADD CONSTRAINT "VehicleTrivia_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturedVehicleOfDay" ADD CONSTRAINT "FeaturedVehicleOfDay_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturedVehicleOfDay" ADD CONSTRAINT "FeaturedVehicleOfDay_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
