/**
 * Fill a flight from Vinmonopolet links, without typing each one into the form.
 *
 * The listing is fetched through the running app's own lookup route, so a wine
 * added this way carries exactly what the "add a wine" box would have given it:
 * price, alcohol, tasting note, the price bucket, and the draft answer key.
 * Written over pg rather than the Prisma client, which is generated as
 * TypeScript the plain node runtime cannot import.
 *
 * Usage:
 *   npm run dev                     # the lookup route has to be up
 *   node --env-file=.env scripts/seed-flight.mjs <eventId> A:WHITE:<url> E:RED:<url> ...
 */
import pg from "pg";

const APP = process.env.APP_URL ?? "http://localhost:3000";
const [eventId, ...specs] = process.argv.slice(2);
if (!eventId || !specs.length) {
  console.error("usage: node --env-file=.env scripts/seed-flight.mjs <eventId> <POSITION>:<WHITE|RED>:<url> ...");
  process.exit(1);
}

// Prisma fills cuids in the client, so the column has no database default.
const cuid = () => "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
const dec = (v) => (v == null ? null : Number(v).toFixed(2));

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

for (const spec of specs) {
  const [position, side, ...rest] = spec.split(":");
  const url = rest.join(":");
  const res = await fetch(`${APP}/api/lookup?url=${encodeURIComponent(url)}`);
  const { wine: w, priceBucket, draftKey } = await res.json();
  if (!w) { console.log(`${position} LOOKUP FAILED — ${url}`); continue; }
  const k = draftKey ?? {};
  const vals = [
    cuid(), eventId, position, side,
    w.name ?? "Unnamed wine", w.producer ?? null, w.vintage ?? null, w.country ?? null,
    w.region ?? null, w.appellation ?? null, w.grapes ?? null, w.tastingNote ?? null,
    w.sourceUrl ?? url, w.sourceRef ?? null,
    dec(w.priceNok), dec(w.alcohol), dec(w.sugarGl), dec(w.acidGl),
    priceBucket ?? null,
    k.keyBody ?? null, k.keyAcidity ?? null, k.keyTannin ?? null, k.keySweetness ?? null, k.keyAlcohol ?? null,
  ];
  await client.query(
    `INSERT INTO "Wine" ("id","eventId","position","side","name","producer","vintage","country",
        "region","appellation","grapes","tastingNote","sourceUrl","sourceRef",
        "priceNok","alcohol","sugarGl","acidGl","priceBucket",
        "keyBody","keyAcidity","keyTannin","keySweetness","keyAlcohol")
     VALUES ($1,$2,$3::"FlightPosition",$4::"WineSide",$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
             $15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
     ON CONFLICT ("eventId","position") DO UPDATE SET
       "side"=EXCLUDED."side", "name"=EXCLUDED."name", "producer"=EXCLUDED."producer",
       "vintage"=EXCLUDED."vintage", "country"=EXCLUDED."country", "region"=EXCLUDED."region",
       "appellation"=EXCLUDED."appellation", "grapes"=EXCLUDED."grapes",
       "tastingNote"=EXCLUDED."tastingNote", "sourceUrl"=EXCLUDED."sourceUrl",
       "sourceRef"=EXCLUDED."sourceRef", "priceNok"=EXCLUDED."priceNok",
       "alcohol"=EXCLUDED."alcohol", "sugarGl"=EXCLUDED."sugarGl", "acidGl"=EXCLUDED."acidGl",
       "priceBucket"=EXCLUDED."priceBucket", "keyBody"=EXCLUDED."keyBody",
       "keyAcidity"=EXCLUDED."keyAcidity", "keyTannin"=EXCLUDED."keyTannin",
       "keySweetness"=EXCLUDED."keySweetness", "keyAlcohol"=EXCLUDED."keyAlcohol"`,
    vals);
  console.log(`${position} ${String(side).padEnd(5)} ${w.name} — kr ${w.priceNok} → bucket ${priceBucket}`);
}
await client.end();
