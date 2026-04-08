-- CreateTable
CREATE TABLE "KnownMake" (
    "name" TEXT NOT NULL,

    CONSTRAINT "KnownMake_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "KnownModel" (
    "make" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "KnownModel_pkey" PRIMARY KEY ("make","name")
);
