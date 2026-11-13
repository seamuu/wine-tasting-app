import assert from "node:assert/strict";
import { loadTs } from "./load-ts.mjs";
const { MAPS, parseCell, cellPoint, pointCell, mapScore, mapRoundReady, svgToMapPoint, mapPointToSvg, outsideEurope } = await loadTs("../lib/map.ts");
const { teamStandings } = await loadTs("../lib/team-results.ts");
for (const mode of ["EUROPE", "WORLD"]) {
  const grid = MAPS[mode];
  for (let row = 1; row <= grid.rows; row++) for (let column = 0; column < grid.columns; column++) {
    const cell = `${String.fromCharCode(65 + column)}${row}`;
    assert.equal(pointCell(cellPoint(cell, mode), mode), cell);
    const { x, y } = mapPointToSvg(cellPoint(cell, mode), mode);
    assert.equal(pointCell(svgToMapPoint(x, y, mode), mode), cell);
    assert.equal(mapScore(cell, cell, mode), 1);
  }
  assert.equal(parseCell("f 4", mode).cell, "F4");
  assert.equal(parseCell("A0", mode), null);
  assert.equal(parseCell("A11", mode), null);
  assert.equal(parseCell("A1junk", mode), null);
  assert.equal(parseCell("", mode), null);
  assert.equal(pointCell({ mapLatitude: NaN, mapLongitude: 0 }, mode), null);
  assert.equal(pointCell({ mapLatitude: 0 }, mode), null);
  assert.equal(svgToMapPoint(0, 0, mode), null);
  assert.equal(pointCell({ mapLatitude: grid.north, mapLongitude: grid.east }, mode), `${String.fromCharCode(64 + grid.columns)}1`);
  assert.equal(pointCell({ mapLatitude: grid.south, mapLongitude: grid.west }, mode), `A${grid.rows}`);
  assert.equal(mapScore("A1", "B2", mode), .5);
  assert.equal(mapScore("A1", "C3", mode), 0);
  assert.equal(mapScore(null, "B2", mode), 0);
}
assert.equal(parseCell("N1", "EUROPE"), null);
assert.equal(parseCell("X10", "WORLD").cell, "X10");
assert.equal(mapScore("X5", "A5", "WORLD"), .5);
assert.equal(mapScore("A1", "A10", "WORLD"), 0);
assert.equal(mapScore("M5", "A5", "EUROPE"), 0);
assert.equal(pointCell({ mapLatitude: -41, mapLongitude: 174 }, "EUROPE"), null);
assert.ok(pointCell({ mapLatitude: -41, mapLongitude: 174 }, "WORLD"));
assert.equal(outsideEurope("Frankrike"), false);
assert.equal(outsideEurope("Østerrike"), false);
assert.equal(outsideEurope("New Zealand"), true);

const wines = ["A", "B", "C"].map((position, i) => ({
  id: position, position, stage: i === 2 ? "UPCOMING" : "REVEALED", name: `Wine ${position}`,
  ...cellPoint(i === 2 ? "J8" : "F4", "EUROPE"),
  priceNok: 100 + 20 * i, country: null, region: null, appellation: `Place ${i}`, grapes: `Grape ${i}`, tastingNote: `Note ${i}`,
}));
assert.ok(mapRoundReady(wines, "EUROPE")); // Shared target cells are valid.
assert.equal(mapRoundReady([{ ...wines[0], mapLatitude: null }, wines[1]], "EUROPE"), false);
const teams = [
  { id: "1", name: "Corks", memberCount: 2, guesses: [], mapGuesses: [{ wineId: "A", cell: "F4" }, { wineId: "B", cell: "G4" }, { wineId: "C", cell: "J8" }] },
  { id: "2", name: "Grapes", memberCount: 5, guesses: [], mapGuesses: [{ wineId: "A", cell: "F4" }] },
];
const result = teamStandings(wines, wines.slice(0, 2), teams, "EUROPE");
assert.equal(result.categories.length, 5);
assert.deepEqual(result.rows.map((row) => row.right), [1.5, 1]);
assert.equal(result.rows[0].of, 10);
assert.equal(result.rows[0].average, .75);
assert.equal(result.rows[0].answered, 2);
assert.equal(result.specialists.find((s) => s.category === "MAP").right, 1.5);
assert.equal(teamStandings(wines, wines.slice(0, 2), teams, "OFF").rows[0].right, 0);
assert.equal(teamStandings(wines, wines.slice(0, 1), teams, "EUROPE").rows[0].right, 1);
console.log("Map checks passed: every grid square, projection round-trips, boundaries, world seam, partial points, repeated regions, missing keys and cumulative scoring.");
