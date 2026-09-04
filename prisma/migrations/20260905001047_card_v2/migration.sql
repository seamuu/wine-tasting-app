-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "FlightPosition" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "WineSide" AS ENUM ('WHITE', 'RED');

-- CreateEnum
CREATE TYPE "RevealMode" AS ENUM ('BLIND', 'OPEN');

-- CreateEnum
CREATE TYPE "WineStage" AS ENUM ('UPCOMING', 'POURING', 'LOCKED', 'REVEALED');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('NEEDS_REVIEW', 'CONFIRMED');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idSet" TEXT NOT NULL DEFAULT 'house',
    "revealMode" "RevealMode" NOT NULL DEFAULT 'BLIND',
    "cardVersion" TEXT NOT NULL DEFAULT 'card-v2',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wine" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "position" "FlightPosition" NOT NULL,
    "side" "WineSide" NOT NULL,
    "stage" "WineStage" NOT NULL DEFAULT 'UPCOMING',
    "name" TEXT NOT NULL,
    "producer" TEXT,
    "vintage" INTEGER,
    "region" TEXT,
    "appellation" TEXT,
    "country" TEXT,
    "grapes" TEXT,
    "sourceUrl" TEXT,
    "sourceRef" TEXT,
    "teaser" TEXT,
    "priceNok" DECIMAL(10,2),
    "alcohol" DECIMAL(4,2),
    "sugarGl" DECIMAL(5,2),
    "acidGl" DECIMAL(5,2),
    "tastingNote" TEXT,
    "priceBucket" INTEGER,
    "keyBody" INTEGER,
    "keyAcidity" INTEGER,
    "keyTannin" INTEGER,
    "keySweetness" INTEGER,
    "keyAlcohol" INTEGER,
    "keyFlavours" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keyLockedAt" TIMESTAMP(3),

    CONSTRAINT "Wine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Taster" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "idA" TEXT NOT NULL,
    "idB" TEXT NOT NULL,
    "name" TEXT,

    CONSTRAINT "Taster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "wineId" TEXT NOT NULL,
    "tasterId" TEXT NOT NULL,
    "side" "WineSide" NOT NULL,
    "priceBucket" INTEGER,
    "body" INTEGER,
    "acidity" INTEGER,
    "tannin" INTEGER,
    "sweetness" INTEGER,
    "alcohol" INTEGER,
    "rating" INTEGER,
    "flavours" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ScanStatus" NOT NULL DEFAULT 'CONFIRMED',
    "reviewNote" TEXT,
    "photoPath" TEXT,
    "readings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wine_eventId_position_key" ON "Wine"("eventId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Taster_eventId_idA_idB_key" ON "Taster"("eventId", "idA", "idB");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_wineId_tasterId_key" ON "Submission"("wineId", "tasterId");

-- AddForeignKey
ALTER TABLE "Wine" ADD CONSTRAINT "Wine_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Taster" ADD CONSTRAINT "Taster_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "Wine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_tasterId_fkey" FOREIGN KEY ("tasterId") REFERENCES "Taster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

