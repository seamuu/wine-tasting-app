# Wine Flight

Paper tasting cards in, a shared results dashboard out. See [SPEC.md](./SPEC.md) for the full product spec.

## What's here

- `public/card-v1.html` — the printable A5 tasting card.
- `public/scan-test.html` — reads a photographed card back into structured data (corner detection, perspective correction, bubble scoring), entirely client-side.
- `app/` — the Next.js app: create an event, scan cards into it, view the dashboard.
- `prisma/schema.prisma` — the data model.
- `scripts/test-scan.mjs` — headless-Chrome harness that runs a real photo through the actual scan code and reports back per-bubble results, for tuning the scan logic against real photos without a browser round-trip.

## Local development

Requires a local Postgres. On this machine that's already running via Homebrew:

```bash
brew services start postgresql@16
```

Then:

```bash
npm install
npx prisma migrate dev   # first time only, or after a schema change
npm run dev
```

Open http://localhost:3000.

## Deploying

`render.yaml` defines a web service plus a Postgres database as a Render Blueprint — connect this repo on Render and it provisions both, migrating the database on every deploy (`prisma migrate deploy` runs as part of the build command).
