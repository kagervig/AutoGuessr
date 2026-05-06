-- CreateEnum
CREATE TYPE "CropMethod" AS ENUM ('standard', 'subject', 'conditional');

-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "cropMethod" "CropMethod" NOT NULL DEFAULT 'conditional',
ADD COLUMN     "transformationSignature" TEXT;
