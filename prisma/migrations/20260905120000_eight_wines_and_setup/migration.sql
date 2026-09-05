
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FlightPosition" ADD VALUE 'E';
ALTER TYPE "FlightPosition" ADD VALUE 'F';
ALTER TYPE "FlightPosition" ADD VALUE 'G';
ALTER TYPE "FlightPosition" ADD VALUE 'H';

-- AlterEnum
ALTER TYPE "ScanStatus" ADD VALUE 'MANUAL';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "guestCount" INTEGER,
ADD COLUMN     "wineCount" INTEGER NOT NULL DEFAULT 4;

