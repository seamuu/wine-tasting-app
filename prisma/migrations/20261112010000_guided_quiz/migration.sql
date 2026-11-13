ALTER TABLE "Event" ADD COLUMN "activePosition" "FlightPosition" NOT NULL DEFAULT 'A',
ADD COLUMN "runStep" TEXT NOT NULL DEFAULT 'COLLECT';
ALTER TABLE "Team" ADD COLUMN "memberCount" INTEGER NOT NULL DEFAULT 1;

-- Preserve where existing tastings have reached. OPEN is retained in the enum
-- for compatibility, but all tastings now follow the blind quiz experience.
UPDATE "Event" SET "revealMode" = 'BLIND';
UPDATE "Event" e SET "activePosition" = w."position",
"runStep" = CASE w."stage" WHEN 'REVEALED' THEN 'STANDINGS'
                         WHEN 'LOCKED' THEN 'ANSWERS' ELSE 'COLLECT' END
FROM (
  SELECT DISTINCT ON ("eventId") "eventId", "position", "stage"
  FROM "Wine"
  ORDER BY "eventId", CASE "stage" WHEN 'POURING' THEN 0 WHEN 'LOCKED' THEN 1
                    WHEN 'UPCOMING' THEN 2 ELSE 3 END,
           CASE WHEN "stage" = 'REVEALED' THEN -ascii("position"::text)
                ELSE ascii("position"::text) END
) w WHERE w."eventId" = e."id";

ALTER TABLE "Team" ADD CONSTRAINT "Team_memberCount_positive" CHECK ("memberCount" BETWEEN 1 AND 100);
ALTER TABLE "Event" ADD CONSTRAINT "Event_runStep_valid"
CHECK ("runStep" IN ('COLLECT', 'ANSWERS', 'REVEAL', 'TASTING', 'QUIZ', 'STANDINGS'));
