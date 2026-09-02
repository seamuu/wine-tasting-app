# Wine Tasting App — Spec v0.1

## Concept

A wine tasting group fills in paper rating cards by hand. The organizer
photographs each card with their phone once the tasting is done. The app
reads the marks off the card automatically and the whole group can browse
the results on a shared dashboard afterward. Nobody except the organizer
touches a phone during the tasting itself.

## Roles

- **Organizer** — runs the event, prints cards beforehand, scans them
  afterward, owns the shared dashboard link.
- **Taster** — fills in a paper card with a pen. Never opens the app.
- **Group** — anyone with the dashboard link. View-only.

## The Card

One **A5 "flight card"** per taster per event, covering the whole flight
(up to 4 wines per side; a second sheet if the flight runs longer).

Fields, top to bottom:

1. **Header** — event name, date, taster name (handwritten, for the
   organizer's own reference only — not what the pipeline reads), plus a
   **taster ID**: two small bubble rows, *Color* (Red/Orange/Yellow/Green/
   Blue) and *Animal* (Fox/Owl/Bear/Wolf), giving 20 unique combinations
   (e.g. "Blue Owl"). This is the identity the scan pipeline actually reads
   — deterministic bubbles, not handwriting, same reasoning as the A–D wine
   letters below. It also keeps tasters blind to each other's scores during
   the event, the same way blind-labelling the wines does.
2. **Four wine blocks** (labeled A–D so tasting can stay blind), each with:
   - Body — 5 bubbles, *Light → Full*
   - Acidity — 5 bubbles, *Soft → Acidic*
   - Tannin — 5 bubbles, *Smooth → Grippy*
   - Sweetness — 5 bubbles, *Dry → Sweet*
   - Overall — 10 bubbles, visually emphasized (this is the headline number,
     scored 1–10 like a normal wine rating; the other four stay 1–5 since
     they're descriptive spectrums, not scores)
   - One word — a single lined box: *"Describe it in one word"*
3. **Corner registration marks** — solid ink squares at all four corners,
   used to perspective-correct the photo before reading marks.

Design constraint carried over from earlier discussion: **ratings are
discrete bubbles, not continuous slider lines.** A filled-or-not check is a
reliable threshold read from a phone photo; a mark-anywhere-on-a-gradient
is not.

Layout is fixed and versioned (`card-v1`, printed at exact A5 dimensions).
If the layout ever changes, it gets a new version number and its own
coordinate map — old scans keep working against the old map.

## Scanning & Extraction Pipeline

Organizer flow: open **Scan** → photograph a card → app shows the read-back
for a 3-second sanity check → confirm or correct → next card. Runs at
whatever pace the organizer works through the stack, no per-taster
involvement.

Steps per photo:

1. **Locate the four corner marks**, compute a perspective transform, warp
   the photo to the card's known flat coordinate space.
2. **Sample each bubble's fixed region** post-warp, compare fill/darkness
   against a threshold calibrated off the sheet's own blank paper tone
   (handles lighting variation across events better than a fixed global
   threshold).
3. **Flag low-confidence reads** (ambiguous fill, smudge, torn corner) for
   the organizer to confirm by eye in the same screen — never silently
   guess.
4. **One-word box**: crop just that region and send it to a vision-capable
   model for handwriting transcription. This is the only network call in
   the pipeline — everything else (steps 1–3) is deterministic, local, and
   free per scan.

This keeps the bulk of the pipeline cheap and offline-capable, and spends
the one AI call only where deterministic image processing genuinely can't
do the job.

## Data Model (sketch)

- `Event` — name, date, flight (ordered list of wines)
- `Wine` — name, producer, vintage, flight position (A/B/C/D)
- `Card` — one per taster per event: taster color+animal ID (what the
  pipeline reads), taster name (handwritten on the card, confirmed/corrected
  by the organizer during scan review — the same "confirm or correct" step
  already in the pipeline, just also resolving identity, not only ratings),
  card-layout version, raw photo reference, scan status (`pending` /
  `needs review` / `confirmed`)
- `Rating` — one per (card, wine): body, acidity, tannin, sweetness (1–5
  each), overall (1–10), one-word descriptor, per-field confidence score
- `Dashboard` — computed, not stored: aggregates `Rating` rows per `Event`,
  displaying each card's confirmed taster name and each wine's real name
  (from `Wine.flight_position`) instead of the blind color+animal/letter IDs

## Shared Dashboard

Read-only, link-based (no login) for the MVP — matches "one shared group"
scope. Shows, per event:

- **Leaderboard** — wines ranked by average overall score
- **Flavor profile** — body / acidity / tannin / sweetness averages per
  wine, shown as an inline bar table (not a radar chart — radar area
  distorts comparison; a table of small bars reads more accurately at a
  glance)
- **In one word** — the transcribed descriptors per wine, as a tag list
- **Scan status** — how many cards are in and how many still need review,
  so the organizer knows when the room's data is complete

## MVP Scope

**In:** single shared group, one event at a time, organizer-only scanning,
bubble ratings + one-word field, read-only dashboard link.

**Out (later):** multiple concurrent groups/accounts, taster-facing app,
continuous-scale ratings, offline queue for scans taken without signal,
historical trends across events.

## Decisions

1. **Multi-group scope** — confirmed: one shared group at a time, no
   account/invite system for MVP.
2. **Stack** — **Next.js + Render (web service + Postgres).** Originally
   proposed Vercel + Supabase; switched to consolidate on Render since
   there's already another project hosted there and it avoids juggling a
   separate database provider — Render's own Postgres covers what Supabase
   would have, minus built-in auth/storage, neither of which the MVP needs
   (no login, and `Card.raw_photo` can live on a Render disk or be
   revisited once real usage clarifies the need). Note: Render's free
   Postgres tier auto-deletes after 30 days — a paid tier (~$7/mo) is
   needed before this holds real event data long-term.
3. **Card capacity** — confirmed: 4 wines/side for v1.
4. **Physical cards after scanning** — doesn't need a policy call for the
   app itself: the organizer can toss or keep the paper, that's a personal
   choice, not a product decision. What *does* matter is that the **digital
   scan is the durable record** — `Card.raw_photo` (see Data Model) is kept
   indefinitely as the source of truth, not deleted after scan confirmation,
   so a card can be re-processed later if the extraction pipeline improves.
