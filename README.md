# Wine Flight

A blind wine quiz, one glass at a time. Each person fills in a paper tasting
card; each team matches price, origin, grape and tasting note to the glasses.

## The flow

1. **Setup:** name the tasting, choose 2–8 wines, add teams and their sizes.
2. **Wines:** search Vinmonopolet or paste a product link. Review imported facts,
   fill any gaps and check which quiz categories are ready. For the map round,
   click each region’s representative location and confirm its grid square.
3. **Print:** one tasting card per guest per wine; a matching quiz and gridded
   map per team when the map round is enabled, plus name tags. For Imeto Julebord,
   the prepared PDFs and quantities are in Setup → Print: white cards, red cards,
   quiz pack, French map and one sheet of name tags for eight people.
4. **Run the quiz:** the laptop shows live collection progress; each wine has its
   own QR code opening a phone scanner. The phone opens the camera and reads the photo automatically, then shows one
   original photo above its summary, with Confirm or Retake. Confirmed cards update the laptop automatically;
   both screens signal when all expected cards are collected. Enter team answers, then
   reveal the bottle. Continue through the wine story, the room’s tasting,
   quiz results and cumulative standings before pouring the next wine.
5. **Room display:** open it on a second screen. It follows the host automatically
   while visible. Reviewing an earlier wine leaves the host’s current step alone.

Every tasting is blind. A bottle stays hidden until **Save & reveal**. Wine
facts come from Vinmonopolet’s embedded product JSON, with manual corrections
available; generating bottle facts with AI is not required. The imported notes
remain in their original Norwegian.

Team points are factual quiz answers: one point per correct match. Personal
ratings determine the room’s favourite wines and never add team points. The
standings show totals, average points per revealed wine, category leaders,
per-wine scores and a growing bottle comparison. Ties and missing answers are
shown explicitly. A matching category only runs if every wine has a distinct
answer. Map squares can repeat between wines.

## The gridded map round

New quizzes default to **Europe**, with a world map available for international
flights. Europe is easier to orient yourself on; a flight containing the Matua
Marlborough Sauvignon needs World or a different, European bottle. The app flags
non-European origins and locations outside the selected map, and keeps the
bottles you already entered.

The host sets a representative point for each wine’s region on the map in Wines.
Country labels help the host orient themselves; team maps have outlines and a
letter/number grid, with no place names or answer pins. Coordinates are not
invented from a country or grape. There is no geocoding API or map subscription.
The [Natural Earth backgrounds](./public/maps/README.md) are bundled locally.

Teams write one cell reference per wine, such as **D5**. The host types it in
alongside the matching answers, or uses the map picker. Guesses are saved with
the same Save & reveal action. The right square earns **1 point**, any touching
square (including diagonals) earns **½**, and other or missing answers earn zero.
The world map wraps east–west. Quiz results show the reference, each team’s pin,
and the awarded points; standings include the bonus and a map-category leader.

The map area locks when team-answer collection starts. Reference points and
individual guesses can still be corrected without changing the active wine.
Existing tastings default to **No map round**, preserving their printed sheets
and scores. Enable Europe or World in Setup before collecting team answers.

Grid extents, labels and scoring are a print contract: keep the v1 definitions
in `lib/map.ts` stable; introduce a new version and a migration for future changes.
Map answers are entered by hand; the tasting-card scanner does not read map dots.

## Local development

Use a supported Node version (`^20.19`, `^22.12`, or `>=24`) and local Postgres.
On this machine Postgres is installed through Homebrew:

```bash
brew services start postgresql@16
npm install
npm run db:migrate
npm run dev
```

Set `DATABASE_URL` in `.env` before migrating. Open <http://localhost:3000>.
Restart the development server after generating a changed Prisma client.

For a backup and a checked migration of an **existing local** database:

```bash
node --env-file=.env scripts/migrate-local.mjs
```

This writes a Postgres dump and an integrity report to a temporary backup folder,
then verifies existing event, wine, team, taster, guess and card data. Remote
connections are rejected by this helper. `npm run db:migrate` is the normal
migration command for a new database or a deployment.

For a new schema change, use `npx prisma migrate dev --config prisma7.config.ts`.
The project uses a named Prisma configuration, so pass it explicitly to Prisma
commands other than generation.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run test:polet
npm run test:rounds
npm run test:map
npm run check:vocab
npm run build -- --webpack
npm run test:guided
npm run test:map:browser
```

`test:polet` uses a saved real product JSON fixture and needs no network or DB.
`test:rounds` checks the full progression, cumulative scoring, ties, missing
answers, category eligibility and scanner payload conversion.

`test:guided` uses headless Chrome and a disposable **local** Postgres database.
It needs an existing production build, `DATABASE_URL` from `.env`, permission to
create a database, and Node 22+ for the native WebSocket client. The default
Chrome path is for macOS; override `CHROME_PATH` elsewhere. It creates a five-wine
quiz through the UI, scans cards through the real endpoint, enters team answers,
checks all four result pages and verifies that the original database is unchanged.
`test:map:browser` additionally checks a five-wine Europe flight and a map-only
New Zealand/world flight, map clicks and keyboard entry, blind keys, PDF page
counts, neighbour points, corrections and phone layouts.

Screenshots, PDFs, a server log and the report are written to a temporary folder.
A passing run drops its own test database; a failed run retains it for inspection.

The default production build uses Turbopack. The webpack command above also
works in environments where Turbopack’s CSS worker cannot bind a local port.

## Existing tastings

The migration keeps existing wines, cards and scores. It makes every tasting
blind and resumes near its first unfinished wine. Existing teams start with a
size of one; check their actual sizes in Setup. Old bottle records can acquire
new Polet fields with **Wines → Answer key & details → Refresh bottle facts**.
Refreshing keeps the wine’s ID and attached cards, and updates the imported facts
and draft structure reference.

The flight letters and card layout are fixed once cards or team answers are
collected, so existing paper and scans remain compatible. Facts, team sizes,
answers and individual cards can still be corrected. Historical summaries stop
at their own wine even after later wines have been revealed.

## Scanner

`public/card-v2.html` is the printable card. `public/scan-v2.html` reads the card
and posts to `/api/scan`; the surrounding app also handles the scanner message
as a fallback. Both save to the same person-and-wine row, so re-scans replace
previous readings. The guided flow rejects cards belonging to another wine.

A failed scan can be entered or corrected by hand. Use dark pen, flat cards and
even lighting. Test one printed sheet before printing the full pack. Phone
camera use still needs a check on the actual device over HTTPS.

## Deploying

`render.yaml` defines a web service and Postgres database. Its build installs the
packages, applies migrations with the named Prisma config, then builds Next.js.
Connecting the Blueprint and deploying are separate from local development.

The older [SPEC.md](./SPEC.md) describes the original paper-card product. This
README describes the current guided team-quiz experience.
