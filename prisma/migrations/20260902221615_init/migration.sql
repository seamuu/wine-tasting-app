-- CreateEnum
CREATE TYPE "FlightPosition" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "TasterColor" AS ENUM ('RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE');

-- CreateEnum
CREATE TYPE "TasterAnimal" AS ENUM ('FOX', 'OWL', 'BEAR', 'WOLF');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('PENDING', 'NEEDS_REVIEW', 'CONFIRMED');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wine" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "flightPosition" "FlightPosition" NOT NULL,
    "name" TEXT NOT NULL,
    "producer" TEXT,
    "vintage" INTEGER,

    CONSTRAINT "Wine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "cardVersion" TEXT NOT NULL DEFAULT 'card-v1',
    "tasterColor" "TasterColor" NOT NULL,
    "tasterAnimal" "TasterAnimal" NOT NULL,
    "tasterName" TEXT,
    "rawPhotoUrl" TEXT,
    "scanStatus" "ScanStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "wineId" TEXT NOT NULL,
    "body" INTEGER,
    "acidity" INTEGER,
    "tannin" INTEGER,
    "sweetness" INTEGER,
    "overall" INTEGER,
    "oneWord" TEXT,
    "bodyReview" BOOLEAN NOT NULL DEFAULT false,
    "acidityReview" BOOLEAN NOT NULL DEFAULT false,
    "tanninReview" BOOLEAN NOT NULL DEFAULT false,
    "sweetnessReview" BOOLEAN NOT NULL DEFAULT false,
    "overallReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wine_eventId_flightPosition_key" ON "Wine"("eventId", "flightPosition");

-- CreateIndex
CREATE UNIQUE INDEX "Card_eventId_tasterColor_tasterAnimal_key" ON "Card"("eventId", "tasterColor", "tasterAnimal");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_cardId_wineId_key" ON "Rating"("cardId", "wineId");

-- AddForeignKey
ALTER TABLE "Wine" ADD CONSTRAINT "Wine_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "Wine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
