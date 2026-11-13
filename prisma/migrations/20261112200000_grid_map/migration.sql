-- Existing flights retain their scores and paper. New quizzes opt in via the
-- create action; there is no backfill of invented wine coordinates.
ALTER TABLE "Event" ADD COLUMN "mapMode" TEXT NOT NULL DEFAULT 'OFF';
ALTER TABLE "Wine" ADD COLUMN "mapLatitude" DOUBLE PRECISION,
ADD COLUMN "mapLongitude" DOUBLE PRECISION;
ALTER TABLE "Event" ADD CONSTRAINT "Event_mapMode_valid"
CHECK ("mapMode" IN ('OFF', 'EUROPE', 'WORLD'));
ALTER TABLE "Wine" ADD CONSTRAINT "Wine_map_point_valid" CHECK (
  ("mapLatitude" IS NULL AND "mapLongitude" IS NULL) OR
  ("mapLatitude" IS NOT NULL AND "mapLongitude" IS NOT NULL
   AND "mapLatitude" BETWEEN -90 AND 90 AND "mapLongitude" BETWEEN -180 AND 180)
);
CREATE TABLE "TeamMapGuess" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "wineId" TEXT NOT NULL,
  "cell" TEXT NOT NULL,
  CONSTRAINT "TeamMapGuess_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TeamMapGuess_cell_valid" CHECK ("cell" ~ '^[A-X]([1-9]|10)$'),
  CONSTRAINT "TeamMapGuess_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TeamMapGuess_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "Wine"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TeamMapGuess_teamId_wineId_key" ON "TeamMapGuess"("teamId", "wineId");
