
-- CreateEnum
CREATE TYPE "QuizCategory" AS ENUM ('PRICE', 'ORIGIN', 'NOTE', 'GRAPE');

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamGuess" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "category" "QuizCategory" NOT NULL,
    "wineId" TEXT NOT NULL,
    "choiceId" TEXT NOT NULL,

    CONSTRAINT "TeamGuess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_eventId_name_key" ON "Team"("eventId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TeamGuess_teamId_wineId_category_key" ON "TeamGuess"("teamId", "wineId", "category");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamGuess" ADD CONSTRAINT "TeamGuess_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamGuess" ADD CONSTRAINT "TeamGuess_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "Wine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamGuess" ADD CONSTRAINT "TeamGuess_choiceId_fkey" FOREIGN KEY ("choiceId") REFERENCES "Wine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

