// Read-only smoke check of the running local app against existing tastings.
import assert from "node:assert/strict";
import pg from "pg";

const base = new URL(process.env.APP_URL ?? "http://localhost:3000");
const database = new URL(process.env.DATABASE_URL ?? "");
const local = (url) => ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
if (!local(base) || !local(database)) throw new Error("This smoke check only contacts a local app and local database.");
const client = new pg.Client({ connectionString: database.href });
try {
  await client.connect();
  const events = (await client.query('SELECT "id" FROM "Event" ORDER BY "id"')).rows;
  const paths = ["/", "/card-v2.html", "/scan-v2.html", ...events.flatMap(({ id }) => [
    `/t/${id}?tab=setup`, `/t/${id}?tab=wines`, `/t/${id}?tab=results`, `/t/${id}/run`, `/t/${id}/scan`, `/t/${id}/present`, `/t/${id}/quiz`, `/t/${id}/quiz?maps=only`,
  ])];
  let checked = 0;
  for (let i = 0; i < paths.length; i += 5) {
    const results = await Promise.allSettled(paths.slice(i, i + 5).map(async (route) => {
      const response = await fetch(new URL(route, base), { signal: AbortSignal.timeout(30000) });
      const html = await response.text();
      assert.equal(response.status, 200, `${route}: HTTP status`);
      assert.ok(html.includes("<html"), `${route}: HTML rendered`);
      checked++;
    }));
    for (const result of results) if (result.status === "rejected") throw result.reason;
  }
  const counts = (await client.query('SELECT (SELECT count(*) FROM "Wine") AS wines, (SELECT count(*) FROM "Submission") AS cards')).rows[0];
  const mapModes = (await client.query('SELECT "mapMode", count(*)::int AS events FROM "Event" GROUP BY "mapMode"')).rows;
  const mapGuesses = Number((await client.query('SELECT count(*) AS n FROM "TeamMapGuess"')).rows[0].n);
  console.log(JSON.stringify({ mapModes, mapGuesses, checkedPages: checked, events: events.length, wines: Number(counts.wines), cards: Number(counts.cards), allHttp200: true }, null, 2));
} finally { await client.end(); }
