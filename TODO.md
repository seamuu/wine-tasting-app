# Wine Flight — next steps

The guided blind quiz is implemented. See [README.md](./README.md) for the
current workflow and [OVERNIGHT_HANDOFF.md](./OVERNIGHT_HANDOFF.md) for the build
and verification notes.

## Before using it at the table

- [ ] Add the real teams and sizes in Setup. Existing tastings had no teams yet.
- [ ] Check the Wines page. Refresh older bottle facts from Vinmonopolet, fill
      any gaps, and confirm which matching categories are playable.
- [ ] Choose Europe or World in Setup and confirm each region’s map reference
      in Wines, if using the map bonus. The team map is included in the quiz pack.
- [ ] Print one test sheet, fill it in with pen, scan it, then print the pack.
- [ ] Test camera capture on the actual phone over HTTPS. Local browser/API and
      saved-photo regressions passed; physical phone capture remains to check.
- [ ] Cover the bottles and label them A–H to match the flight.
- [ ] If a hosted URL is needed, connect and deploy the Render Blueprint.
      The local work has not been deployed.

## Optional future features

- [ ] Export the final comparison and standings as an image or PDF.
- [ ] Add a custom host-written introduction or “why I chose this bottle” note.

## Built and verified

- Setup: teams and sizes, 2–8 wines, print quantities and readiness.
- Wine import: embedded Vinmonopolet JSON, grapes, sensory ratings, educational
  grape notes, pairings and measured label figures, with manual corrections.
- Always blind, with one explicit Save & reveal action per wine.
- Guided sequence: scan cards → team answers → wine story → room tasting →
  quiz results → cumulative standings → next wine.
- Saved current wine and step, live room display, historical review without
  moving the live cursor, and protection against repeated/stale forms.
- Europe/world grid maps: offline outlines, host-confirmed region references,
  blank printable team maps, per-wine cell guesses, pin reveals and neighbour
  half points. Map areas lock after collection; old scores are unchanged.
- Team quiz totals, average points per wine, topic leaders, ties and missing
  answers; personal ratings build the bottle comparison separately.
- Per-wine scanner context, manual entry and corrections, safe re-scans, and
  frozen printed-card settings after collection starts.
- End-to-end five-wine browser test, parser/scoring tests, vocabulary checks,
  photographed-card regression, production build and existing-data preservation.

## Ongoing checks

Use flat cards and even lighting. A card needs its wine letter and both name
bubbles before it can be filed. Run `npm run check:vocab` after editing either
the printed vocabulary or its server-side copy. Migration commands use
`--config prisma7.config.ts`; `npm run db:migrate` applies committed migrations.
