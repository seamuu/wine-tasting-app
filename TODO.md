# Wine tasting — what's left

The setup decisions that used to live here (how many people, how many wines,
what everyone's called, how much to print) are **now in the app**, on the Setup
tab, where they belong. It does the arithmetic and warns you when a choice
would invalidate a pack you've already printed.

---

## 1. Only you can do these

- [ ] **Deploy to Render.** `render.yaml` is in the repo, so: render.com →
      **New → Blueprint** → connect `seamuu/wine-tasting-app` → Apply. It
      creates the web service and a free Postgres and runs the migrations.
- [ ] **Test the scanner on the Render URL, from your actual phone.** The
      camera needs HTTPS, which Render gives you and your laptop doesn't. This
      is the one thing most likely to bite on the night.
- [ ] **Fill in Setup, then print one sheet**, fill it in, scan it, and only
      then print the rest.
- [ ] **Bag or number the bottles** so A/B/C/D matches what's in the glass.
- [ ] **Pens, not pencils.** The scanner wants dark marks.

## 2. Still to build

- [ ] **The wine dossier** — Vinmonopolet link → infographic. Mock-up only.
- [ ] **Per-wine notes on the reveal slide** — there's room for a line of
      "why this wine" if you want to say something about each one.
- [ ] **Export the results** as an image or PDF to post afterwards.

## 3. Known limits

- **Scanning wants flat, even light.** Hard shadows across the card have been
  the main failure mode. Even light beats bright light.
- **Re-scanning is safe.** Same person + same wine replaces the earlier read.
- **A card with no wine letter or no name bubbles can't be filed** — the
  scanner says so rather than guessing. Type it in by hand instead.
- **`npx prisma migrate dev` has to be run by you**, in your own terminal — it
  needs an interactive prompt Claude can't answer. Render uses `migrate deploy`,
  which is fine.
- **`npm run check:vocab`** fails if the card's aroma list and `lib/flavours.ts`
  ever drift apart. Run it after editing either.

---

## Done

- Setup tab: guests, wines, vocabulary, reveal mode, print arithmetic, readiness
- Up to **8 wines** (A–H), on the card and throughout
- Wines tab: Vinmonopolet lookup, or just a name; full answer key including aromas
- Scan tab, plus **type a card in by hand** when a photo won't read
- Run screen for your phone: cards-in counts, pour → cards in → reveal
- Present deck: arrow keys, fullscreen, one screen per slide, never scrolls
- Blind mode actually hides the wine until you reveal it
- Match scoring (price 25 / structure 35 / aroma 40), leaderboard, superlatives
- Results tab: flavour wheel, ratings, structure, price, per-person breakdown
