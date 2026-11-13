import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";

const { ROUND_STEPS, nextRound, revealedThrough } = await loadTs("../lib/rounds.ts");
const { teamStandings } = await loadTs("../lib/team-results.ts");
const { CATEGORIES, playable, optionOrder } = await loadTs("../lib/quiz.ts");
const { toPayload } = await loadTs("../lib/scan-payload.ts");
const { demoAnswerRows, PRACTICE_WINES } = await loadTs("../lib/demo.ts");
const demo = {
  idSet: "colours", wineCount: 2,
  wines: [
    { id: "practice-white", position: "A", name: PRACTICE_WINES.WHITE },
    { id: "practice-red", position: "B", name: PRACTICE_WINES.RED },
  ],
  teams: [{ id: "first", name: "Team 1" }, { id: "second", name: "Team 2" }],
};
assert.equal(demoAnswerRows(demo).length, 16, "New demo names must receive the sample answers");
assert.equal(demoAnswerRows({ ...demo, wines: demo.wines.map(w => ({ ...w, name: w.name.replace("(fictional)", "\u2014 fictional") })) }).length, 16, "Existing demos keep their sample-answer support");
assert.equal(demoAnswerRows({ ...demo, wines: demo.wines.map(w => ({ ...w, name: "Real bottle" })) }).length, 0);
const wines = Array.from({ length: 5 }, (_, i) => ({
  id: `wine-${i}`, position: String.fromCharCode(65 + i), name: `Wine ${i}`,
  stage: i < 3 ? "REVEALED" : "UPCOMING", priceNok: 150 + i * 20,
  appellation: `Place ${i}`, region: null, country: null, grapes: `Grape ${i}`,
  tastingNote: `Distinctive note ${i}`,
}));
assert.deepEqual(nextRound(wines, "A", "COLLECT"), { position: "A", step: "ANSWERS" });
assert.deepEqual(nextRound(wines, "A", "STANDINGS"), { position: "B", step: "COLLECT" });
assert.equal(nextRound(wines, "E", "STANDINGS"), null);
assert.equal(nextRound(wines, "Z", "COLLECT"), null);
assert.deepEqual(revealedThrough(wines, "B").map((w) => w.position), ["A", "B"]);
let cursor = { position: "A", step: "COLLECT" }, steps = 1;
while (nextRound(wines, cursor.position, cursor.step)) { cursor = nextRound(wines, cursor.position, cursor.step); steps++; }
assert.equal(steps, wines.length * ROUND_STEPS.length);

const answers = (wine, count) => CATEGORIES.slice(0, count).map((category) => ({ category, wineId: wine.id, choiceId: wine.id }));
const teams = [
  { id: "1", name: "Corks", memberCount: 3, guesses: [...answers(wines[0], 4), ...answers(wines[1], 2), ...answers(wines[4], 4)] },
  { id: "2", name: "Grapes", memberCount: 7, guesses: [...answers(wines[0], 2), ...answers(wines[1], 4)] },
  { id: "3", name: "Stems", memberCount: 2, guesses: [] },
];
const first = teamStandings(wines, revealedThrough(wines, "A"), teams);
assert.equal(first.rows[0].team.name, "Corks");
assert.equal(first.rows[0].right, 4);
assert.equal(first.rows[0].of, 4);
assert.equal(first.rows[0].average, 4);
const second = teamStandings(wines, revealedThrough(wines, "B"), teams);
assert.deepEqual(second.rows.map((r) => r.right), [6, 6, 0]);
assert.deepEqual(second.rows.map((r) => r.rank), [1, 1, 3]);
assert.deepEqual(second.rows.map((r) => r.average), [3, 3, 0]);
assert.equal(second.rows[0].of, 8);
assert.ok(second.specialists.some((s) => s.teams.length === 2));
assert.deepEqual(teamStandings(wines, [], teams).rows.map((r) => r.average), [0, 0, 0]);
const duplicates = wines.map((w) => ({ ...w, grapes: "Chardonnay" }));
assert.equal(playable(duplicates, "GRAPE"), false);
assert.equal(teamStandings(duplicates, duplicates.slice(0, 1), teams).categories.length, 3);
for (const category of CATEGORIES) {
  const order = optionOrder("event", category, wines);
  assert.equal(new Set(order.map((w) => w.id)).size, 5);
  assert.deepEqual(optionOrder("event", category, wines).map((w) => w.id), order.map((w) => w.id));
}

const scan = { side: "white", groups: [
  { name: "Wine", kind: "one", value: "A", flag: null },
  { name: "You are", kind: "one", value: "Hot", flag: null },
  { name: "You are", kind: "one", value: "Mommy", flag: null },
  { name: "Rating", kind: "one", value: "8", flag: null },
  { name: "Citrus fruit", kind: "many", value: ["Lemon"], flag: null },
] };
const payload = toPayload("event", scan, [], [{ position: "A", side: "WHITE", count: 0, name: "Hidden" }]);
assert.equal(payload.winePosition, "A");
assert.equal(payload.rating, 8);
assert.deepEqual(payload.flavours, ["Citrus fruit|Lemon"]);
assert.equal(payload.priceBucket, null);
console.log("Guided quiz checks passed: full flight progression, cumulative scoring, ties, missing answers, categories and scanner payload.");
