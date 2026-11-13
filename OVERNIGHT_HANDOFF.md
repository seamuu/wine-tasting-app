# Guided wine quiz — handoff

The app is running at **http://localhost:3000** with the updated local database.
The work is now included in the repository. Local tasting records and scanned
results remain in the local database; Git contains the app, migrations and print files.

## What to try

Open a tasting, add your teams and their sizes in **Setup**, then check **Wines**.
The Wines page shows which of the four matching categories have enough distinct
facts. New quizzes also have a Europe grid-map bonus: confirm each region’s
location in Wines, or choose World / No map round in Setup. Use **Refresh bottle facts** inside a wine’s details to fill older records
from the improved Vinmonopolet parser, or edit the facts yourself.

Print the tasting cards and team sheets, open **Run the quiz**, and open
**Room display** in another window or on a second screen. The room follows the
host while visible. Keep its page in “Following the host” mode during the night;
reviewing an earlier revealed wine pauses following until you select it again.

Your existing tastings had no teams configured. Add the real teams and sizes
before running them; their wines, tasters and scanned cards are still there.

## The new flow

For each glass, the host works through:

1. **Scan cards** — this wine only, with the bottle identity hidden. Progress
   comes from the team sizes. A failed scan can be entered or corrected manually.
2. **Team answers** — enter every team’s option numbers and, if enabled, map square for this wine. Save
   incomplete answers or choose **Save & reveal** when ready.
3. **The wine** — bottle identity, nose and palate, grapes and educational copy,
   Vinmonopolet’s sensory ratings and food pairings, where available.
4. **The room** — average personal rating, rating distribution, aroma wheel and
   structure comparison. These opinions do not add team quiz points.
5. **Quiz results** — correct options, each team’s selections and points for this
   wine. One point per correct factual match; unanswered questions earn zero. The map
   bonus adds 1 for the right square or ½ for a neighbour.
6. **Standings** — team totals, average points per wine, category leaders,
   individual wine scores, and the room’s growing bottle comparison. Continue
   to the next glass, or revisit a revealed wine.

The four room-facing result pages are steps 3–6. There is one explicit reveal
and no blind/open setting. The host’s current wine and step survive reloads;
replayed old forms cannot skip a step. Historical summaries only include wines
revealed through their own position.

Team sizes determine the expected card count and print quantities. Every team
has the same points available per wine. Ties and missing answers are shown.

## Data and scanner preservation

The local migration was backed up and checked field by field. It preserved:

| Data | Count |
| --- | ---: |
| Existing tastings | 4 |
| Wines | 16 |
| Tasters | 15 |
| Individual tasting cards | 70 |

Existing names, wine details, card readings, IDs and stages were kept. The
intentional setting change makes all tastings blind. The migration adds the
saved round position and team sizes.

Backup and verification files:

- `/private/var/folders/1t/h_5z408x2m5gm2kz9d9682y80000gn/T/wine-flight-backup-AB9YOJ/before.dump`
- `/private/var/folders/1t/h_5z408x2m5gm2kz9d9682y80000gn/T/wine-flight-backup-AB9YOJ/verified.json`

The scanner’s image-reading algorithm and printed vocabulary are unchanged.
The guided view rejects another wine’s card, hides bottle names in filing
messages, and supports both direct API filing and the embedded-message fallback.
Re-scans replace the same person-and-wine row. Once collection begins, flight
letters and printed card settings stay fixed to preserve paper compatibility.

## Verification

- Production build: `npm run build -- --webpack`.
- Lint, TypeScript and printed-vocabulary checks passed.
- Parser regression passed using a saved real Chablis product JSON, malformed
  content and HTML fallback cases.
- Pure progression/scoring checks passed: five wines, six steps each, cumulative
  points, ties, missing answers, category eligibility and scanner payloads.
- The full browser/API test used a disposable database and two browser views.
  It created the tasting and teams through the UI, added five bottles, checked
  printing and hidden identities, scanned cards, entered answers and verified
  all four result pages and cumulative scores for all five wines. It also
  checked live display updates, stale forms, duplicate team names, corrections,
  phone layouts and the unchanged original database.
- Existing photographed v2 card `IMG_5239.JPG` passed the scanner’s 28-group
  comparison between the normal and no-corner-square reading paths.
- The restarted development server returned HTTP 200 for **31 pages**, covering
  the home page, printable card, scanner, and setup/wines/results/run/display
  pages plus quiz/map-print previews for all four existing tastings.

## Practical limits

Vinmonopolet’s notes remain in Norwegian. Facts are imported from their listing;
there is no AI account or API key to configure. The host can fill missing facts
or correct imported values.

Phone camera capture still needs a check on the actual phone over HTTPS. Print
and scan one test sheet before printing the whole pack.

Webpack was used for local verification because Turbopack’s CSS worker cannot
bind its worker port in this execution environment. The running dev server also
uses webpack. The Render configuration has been updated to use the named Prisma
migration configuration and a Node version supported by the installed Prisma.
No deployment was performed.

The [README](./README.md) has the current workflow, commands and test instructions.

## Browser artifacts

Final passing run:

- [Verification report](/private/var/folders/1t/h_5z408x2m5gm2kz9d9682y80000gn/T/wine-quiz-check-kP1dUP/report.json)
- [Wine story](/private/var/folders/1t/h_5z408x2m5gm2kz9d9682y80000gn/T/wine-quiz-check-kP1dUP/04-room-wine-story.png)
- [Room tasting](/private/var/folders/1t/h_5z408x2m5gm2kz9d9682y80000gn/T/wine-quiz-check-kP1dUP/07-room-tasting-desktop.png)
- [Quiz results](/private/var/folders/1t/h_5z408x2m5gm2kz9d9682y80000gn/T/wine-quiz-check-kP1dUP/09-room-quiz-results.png)
- [Final standings](/private/var/folders/1t/h_5z408x2m5gm2kz9d9682y80000gn/T/wine-quiz-check-kP1dUP/05-final-room-standings.png)
- [Phone answer entry](/private/var/folders/1t/h_5z408x2m5gm2kz9d9682y80000gn/T/wine-quiz-check-kP1dUP/03-host-answers-mobile.png)

The passing test database was removed after verification, as were the disposable
databases from earlier harness debugging. Your development database and the
backup were retained. Temporary screenshot and backup folders can eventually be
cleaned by macOS; copy them elsewhere if you want to keep them long term.


## Gridded map addition

**Europe is the default for new quizzes.** It is a more manageable map for a
European flight. World is available for an international flight, including the
Marlborough Sauvignon in the original proposed lineup. No existing bottles were
removed or substituted. Existing tastings keep the map switched off, so old
scores and printed sheets remain valid.

To use it:

1. Choose **Europe** or **World** in Setup, before team answers are collected.
2. In Wines, find each bottle’s **Map answer**, click a representative spot in
   the region, and confirm. Country names help the host orient themselves.
   The reference is chosen by the host; no coordinates are guessed from a grape
   or country. Out-of-area locations and non-European origins are flagged.
3. Print the team quiz pack. It includes a blank, unlabelled grid map and answer
   rows for each team. The five-wine pack is two A4 pages per team: matching quiz
   and map. A separate map-only print preview is available in Setup.
4. Teams write a cell reference such as **D5** for each glass. Type it in during
   Team answers, or use the map picker. The same square can be used for several
   wines; this is not a one-of-each matching puzzle.
5. Save & reveal. The wine story shows the region’s location; quiz results show
   the reference square and numbered team pins. Right square: **1 point**;
   any touching square, including diagonals: **½ point**; otherwise **0**.
   The world map wraps east–west. Totals, averages and category leaders include
   map points, while personal ratings remain separate.

The map area locks once team-answer collection starts. Map references and saved
guesses can be corrected without moving the live round. Old map guesses are
kept when correcting a different wine. A map-only flight also works when none
of the four matching categories have distinct answers.

The maps are bundled offline SVGs with country outlines from Natural Earth.
There is no map API key, subscription, remote tile service or geocoding call.
Grid extents and references are shared between printing, input and scoring.
Map answers are entered by hand; map-dot photography is not part of the scanner.

The map migration was applied after a fresh local backup and field-by-field
preservation check. All 4 tastings, 16 wines, 15 tasters and 70 cards remain.
The restarted local app still runs at http://localhost:3000.

### Map verification and previews

The final map browser run passed for a five-wine Europe quiz and a two-wine
New Zealand/world quiz. It checked host clicks and keyboard selection, missing
references, non-European bottle warnings, hidden targets, exact/adjacent/blank
scoring, fractional totals, corrections to earlier guesses, the locked map area,
map-only play, phone layouts, and zero browser exceptions.

The PDF check used long notes and grape blends, verified no option-column
overflow, and produced **four A4 pages for two teams**: one matching page and one
blank map per team. The world map-only pack produced one A4 page for its team.
The original five-wine quiz/scanner regression also passed with the map off.
Lint, TypeScript, the production build, parser/progression/map tests and card
vocabulary checks passed. The local 31-page smoke check passed after migration, including quiz and map-print previews. All four existing tastings still have the map off and zero map guesses, preserving their scoring.

Final artifacts (test data, not a shopping list):

- [Map verification report](/private/var/folders/1t/h_5z408x2m5gm2kz9d9682y80000gn/T/wine-map-check-RsqUwh/report.json)
- [Sample Europe quiz + map PDF](/private/var/folders/1t/h_5z408x2m5gm2kz9d9682y80000gn/T/wine-map-check-RsqUwh/europe-team-pack.pdf)
- [Sample world map PDF](/private/var/folders/1t/h_5z408x2m5gm2kz9d9682y80000gn/T/wine-map-check-RsqUwh/world-team-map.pdf)
- [Map reveal and team guesses](/private/var/folders/1t/h_5z408x2m5gm2kz9d9682y80000gn/T/wine-map-check-RsqUwh/04-europe-map-guesses.png)
- [Phone map results](/private/var/folders/1t/h_5z408x2m5gm2kz9d9682y80000gn/T/wine-map-check-RsqUwh/05-europe-map-guesses-phone.png)
- [Original quiz/scanner regression report](/private/var/folders/1t/h_5z408x2m5gm2kz9d9682y80000gn/T/wine-quiz-check-ZWgpQy/report.json)

Nothing is deployed. The remaining real-night setup is to enter team sizes,
confirm the chosen regions on the map, and test a printed tasting card on the
actual phone over HTTPS. Map guesses use manual cell entry or the picker.


## Scanner practice pack

The home page now has **Create scanner practice →**, which creates a separate
two-wine fictional tasting matching four filled-in sample cards. Setup also links
to samples matching the current tasting's card settings. See
[the walkthrough](TESTING_WALKTHROUGH.md) and `public/practice-cards/` for the
two-page A4 PDF, individual PNGs, ZIP and expected scanner readings.

All four PNGs passed the actual scanner with automatic corner detection. This
found and fixed an empty Price group crash on cards printed without a price row.
The isolated browser regression passed, including the practice creation button,
all five guided rounds and unchanged original development data. Production build
and lint passed. Physical printer/phone testing remains for the user. No practice
event was added to the existing development database by these tests.


### Phone-test follow-up

The scanner now hides Price guess entirely when the printed card has no price
row. The latest read, photo and corner positions survive a reload in the same
browser tab for up to eight hours, scoped to the tasting, wine and card layout.
Restoring does not submit the card again. Choosing a new photo clears the old
result. Scan autosave now uses the API without invoking a Server Action or refreshing
the host route. Card counts and recent cards update locally. The phone-sized
browser regression verifies that both host and scanner scroll positions stay
unchanged and that no host-route refresh is requested after a scan saves.


### Single-card downloads

The sample-card page now displays one card per page, with individual PDF and PNG
downloads for each default practice card. `filled-cards-one-per-page.pdf` has four
A5 pages; `A-1.pdf`, `A-2.pdf`, `B-1.pdf`, and `B-2.pdf` each have exactly one A5
page. These are suitable for displaying one card full screen on reMarkable.
PDF page counts and all four scanner readings were verified.


### Explicit scan confirmation (current behaviour)

Reading a card no longer saves or uploads it automatically. Under the summary,
**Confirm & save** submits it once; on success **Scan next card** opens the
camera/photo picker. **Retake card** replaces an unconfirmed photo. Failed
saves stay on the review with retry available. The app receives a saved-record
notification and updates progress locally; it no longer files a second copy.

The isolated browser checks cover an actual filled-card image (no submission
during review, correct values after confirming, saved-state recovery on reload),
phone scroll stability, double taps, failure/retry and the Next photo picker.
The complete five-wine guided regression, production build and lint passed.


### Current scanner UX: separate screens and wine-specific QR codes

The laptop's collection page has live progress and a QR code, with saved-card
corrections collapsed. There is no embedded scanner in its default view.
The phone scanner at `/t/[id]/scan?wine=A` is pinned to that wine, with separate
Wine → Scan a card → Read → Summary screens. Summary offers Confirm & save or
Retake. A successful confirmation opens a separate Saved screen, then Next card
returns to capture. Completion is signalled on both phone and laptop. Each wine
has a different QR code; an A link never silently switches to B with the host.

The wizard is a presentation layer over the existing card-reading engine. The
original diagnostic scanner remains available separately; it is not shown in
the normal phone flow. A hidden adjustment disclosure is available on Read.

Verified: actual sample-card reads, one visible wizard screen at a time on a
390px phone, explicit single-save confirmation, retake, unreadable-photo recovery,
network-failure retry, saved-state restoration, distinct QR codes, pinned wine
selection, live laptop completion, five full quiz rounds and historical fixes.
Build, lint and diff checks passed; development tasting data is preserved.

Artifacts:
- Guided browser report: `/private/var/folders/1t/h_5z408x2m5gm2kz9d9682y80000gn/T/wine-quiz-check-ezUQ4j/report.json`
- Real phone-screen screenshots: `/private/var/folders/1t/h_5z408x2m5gm2kz9d9682y80000gn/T/wine-scanner-screens-5OfKdq/`

Refresh the laptop's tasting page and scan its current wine's QR code to use
the new phone flow. Continue with the existing Scanner practice tasting.


### Latest simplification pass

Setup is now a single vertical flow with one numbered section expanded at a
time. Save & continue opens Teams; existing teams and wine details are collapsed.
The right-hand instruction/readiness sidebar is removed. Start the quiz stays
visible in a sticky header. During the quiz, history and step navigation are
secondary disclosures. The optional projection view is now More options →
Show on a TV, with an explanation; it is not a primary setup button.

The phone camera opens directly from Scan a card / Scan next card. Photos are
read automatically and reviewed as one original image above the parsed summary.
No processed image or blank canvas is shown. The saved-card count is always in
the header, and the final save shows All cards scanned and says the user can
close the screen. Legacy embedded scanner links also use the simplified view.

New Demo tastings start ready to run with sample team answers. Existing known
fictional demos had 24 missing answers filled, without overwriting any answers
or resetting cards or quiz progress. The new-demo action creates a separate
tasting; it does not reset one.

Correct references now use dark blue outlines, explicit tick marks and Ref
labels instead of gold. Correct quiz answers show actual values (e.g. kr 150),
not bare printed-option numbers. Team totals are explicit points; guesses,
per-wine/category breakdowns and bottle comparisons are expandable. The wheel
and rating histogram are retained.

Passed: production build, lint, TypeScript, full five-wine browser regression,
Europe/world map and print regression, camera-to-summary phone checks, automatic
reading, retake, duplicate protection, retry, live completion and historical
corrections. Existing development tasting data is preserved.

Review artifacts:
- `/private/var/folders/1t/h_5z408x2m5gm2kz9d9682y80000gn/T/wine-quiz-check-QAkxjx/report.json`
- `/private/var/folders/1t/h_5z408x2m5gm2kz9d9682y80000gn/T/wine-quiz-check-QAkxjx/setup-single-column.png`
- `/private/var/folders/1t/h_5z408x2m5gm2kz9d9682y80000gn/T/wine-scanner-screens-IQoDrH/summary.png`
- `/private/var/folders/1t/h_5z408x2m5gm2kz9d9682y80000gn/T/wine-map-check-yzLtw9/report.json`

Refresh laptop and phone once to load this version. Nothing was deployed.
