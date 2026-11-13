
-- AlterTable
ALTER TABLE "Wine" ADD COLUMN     "acidRaw" INTEGER,
ADD COLUMN     "bodyRaw" INTEGER,
ADD COLUMN     "colour" TEXT,
ADD COLUMN     "foodPairing" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "grapeNotes" JSONB,
ADD COLUMN     "smell" TEXT,
ADD COLUMN     "storage" TEXT,
ADD COLUMN     "sweetRaw" INTEGER,
ADD COLUMN     "tanninRaw" INTEGER,
ADD COLUMN     "taste" TEXT;

