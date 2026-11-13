// Exercises map setup, printed PDFs, blind answer entry, fractional scoring and
// corrections in a disposable LOCAL database. No existing tasting is modified.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import pg from "pg";
import { loadTs } from "./load-ts.mjs";
import { availablePort, launchBrowser, until } from "./lib/browser.mjs";

const original = new URL(process.env.DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1", "[::1]"].includes(original.hostname)) throw new Error("A local database is required");
const database = `codex_map_test_${Date.now()}`, testUrl = new URL(original);
testUrl.pathname = `/${database}`;
const directory = await mkdtemp(path.join(os.tmpdir(), "wine-map-check-"));
const env = { ...process.env, DATABASE_URL: testUrl.href, NODE_ENV: "production" };
const admin = new pg.Client({ connectionString: original.href });
const { MAPS, cellPoint, mapPointToSvg } = await loadTs("../lib/map.ts");
const { CATEGORIES, optionOrder } = await loadTs("../lib/quiz.ts");
let db, server, browser, host, passed = false, log = "";
const report = { directory, database, checks: [] };
const note = (text) => { console.log(`✓ ${text}`); report.checks.push(text); };
async function migrate() {
  const child = spawn(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy", "--config", "prisma7.config.ts"], { env, stdio: ["ignore", "pipe", "pipe"] });
  let output = ""; child.stdout.on("data", (data) => { output += data; }); child.stderr.on("data", (data) => { output += data; });
  const code = await new Promise((resolve, reject) => { child.on("error", reject); child.on("exit", resolve); });
  if (code !== 0) throw new Error(output.replaceAll(testUrl.href, "[test database]"));
}
try {
  await admin.connect();
  const before = (await admin.query('SELECT (SELECT count(*) FROM "Event") AS events,(SELECT count(*) FROM "Wine") AS wines,(SELECT count(*) FROM "Submission") AS cards')).rows[0];
  await admin.query(`CREATE DATABASE "${database}"`);
  await migrate();
  db = new pg.Client({ connectionString: testUrl.href }); await db.connect();
  const port = await availablePort(), base = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--port", String(port), "--hostname", "127.0.0.1"], { env, stdio: ["ignore", "pipe", "pipe"] });
  server.stdout.on("data", (data) => { log += data; }); server.stderr.on("data", (data) => { log += data; });
  await until(async () => (await fetch(base)).ok, "Next startup");
  browser = await launchBrowser(directory); host = await browser.page();
  const room = await browser.page(), printed = await browser.page();

  async function createEvent(name, wineCount, mode, teamNames) {
    await host.navigate(base);
    await host.submit("form", { name }, "Create tasting →");
    await until(() => host.evaluate("!!document.querySelector('select[name=wineCount]')"), "tasting setup loaded");
    await host.waitText("Your teams");
    const { id, mapMode } = (await db.query('SELECT "id","mapMode" FROM "Event" WHERE "name"=$1', [name])).rows[0];
    assert.equal(mapMode, "EUROPE", "New quizzes default to Europe");
    await host.submit('form:has(select[name=wineCount])', { wineCount: String(wineCount), mapMode: mode }, "Save & continue →");
    await until(async () => (await db.query('SELECT "wineCount","mapMode" FROM "Event" WHERE "id"=$1', [id])).rows[0].wineCount === wineCount, "save map setup");
    for (const team of teamNames) {
      await host.submit('form.team-form:not(:has(input[name=teamId]))', { name: team, memberCount: "2" }, "Add team");
      await until(() => host.evaluate(`[...document.querySelectorAll('form.team-form input[name=name]')].some(input=>input.defaultValue===${JSON.stringify(team)})`), `render ${team}`);
    }
    await host.navigate(`${base}/t/${id}?tab=wines`);
    for (let i = 0; i < wineCount; i++) {
      const name = `Hidden ${mode} bottle ${String.fromCharCode(65 + i)}`;
      await host.submit('form:has(input[name=sourceUrl])', { name, position: String.fromCharCode(65 + i), side: "WHITE" }, "Add to the flight");
      await host.waitText(name);
    }
    return { id, wines: (await db.query('SELECT * FROM "Wine" WHERE "eventId"=$1 ORDER BY "position"', [id])).rows,
      teams: (await db.query('SELECT * FROM "Team" WHERE "eventId"=$1 ORDER BY "name"', [id])).rows };
  }
  const europe = await createEvent("Gridded Europe browser check", 5, "EUROPE", ["North", "South"]);
  note("New quizzes default to Europe and save teams and map settings through the UI");
  for (let i = 0; i < 5; i++) await db.query('UPDATE "Wine" SET "country"=$1,"appellation"=$2,"grapes"=$3,"priceNok"=$4,"tastingNote"=$5 WHERE "id"=$6',
    [i === 1 ? "New Zealand" : "Frankrike", `Representative region ${i}`, `Grape ${i} 45%, Cabernet Sauvignon 35%, Sauvignon Blanc 20%`, 150 + 20 * i, `Distinct note ${i}: A fresh, lively wine with ripe apple, citrus, herbs and mineral notes, a long finish and balanced acidity. Hints of stone fruit, flowers and spice.`, europe.wines[i].id]);
  await host.navigate(`${base}/t/${europe.id}?tab=setup`);
  await host.waitText("from outside Europe");
  assert.equal((await db.query('SELECT "name" FROM "Wine" WHERE "id"=$1', [europe.wines[1].id])).rows[0].name, europe.wines[1].name);
  await host.navigate(`${base}/t/${europe.id}/run`);
  await host.waitText("Confirm each region’s location in Wines");
  note("A non-European bottle is flagged without replacement; missing map references keep the quiz in setup");
  await db.query('UPDATE "Wine" SET "country"=\'Frankrike\' WHERE "eventId"=$1', [europe.id]);
  await host.navigate(`${base}/t/${europe.id}?tab=wines`);
  const targets = ["D5", "D5", "D6", "G8", "C6"];
  // Confirm using real map click handlers, with one keyboard selection check.
  for (let i = 0; i < 5; i++) {
    const point = cellPoint(targets[i], "EUROPE"), xy = mapPointToSvg(point, "EUROPE"), grid = MAPS.EUROPE;
    await host.evaluate(`(() => { const form=document.querySelectorAll('.map-target-editor form')[${i}]; form.closest('.wine-config').open=true; form.closest('details').open=true; const svg=form.querySelector('svg'); svg.scrollIntoView({block:'center'}); const b=svg.getBoundingClientRect(); svg.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:b.left+${xy.x / grid.width}*b.width,clientY:b.top+${xy.y / grid.height}*b.height})); })()`);
    await until(() => host.evaluate(`document.querySelectorAll('.map-target-editor input[aria-label="Map answer square"]')[${i}].value===${JSON.stringify(targets[i])}`), "target click");
    if (i === 0) {
      await host.evaluate("document.querySelector('.map-target-editor svg').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))");
      await until(() => host.evaluate("document.querySelector('.map-target-editor input[aria-label=\"Map answer square\"]').value==='E5'"), "keyboard right");
      await host.evaluate(`(() => { const svg=document.querySelector('.map-target-editor svg'); const b=svg.getBoundingClientRect(); svg.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:b.left+${xy.x / grid.width}*b.width,clientY:b.top+${xy.y / grid.height}*b.height})); })()`);
    }
    await host.evaluate(`document.querySelectorAll('.map-target-editor form')[${i}].requestSubmit()`);
    await until(async () => (await db.query('SELECT "mapLatitude" FROM "Wine" WHERE "id"=$1', [europe.wines[i].id])).rows[0].mapLatitude != null, "save target");
    await until(() => host.evaluate(`document.querySelectorAll('.map-target-editor summary')[${i}].textContent.includes(${JSON.stringify(targets[i])})`), "render saved map target");
  }
  note("Host map clicks and keyboard arrows set confirmed references; two wines can share a square");
  europe.wines = (await db.query('SELECT * FROM "Wine" WHERE "eventId"=$1 ORDER BY "position"', [europe.id])).rows;
  await printed.navigate(`${base}/t/${europe.id}/quiz`);
  assert.equal(await printed.evaluate("document.querySelectorAll('.qs-sheet').length"), 4);
  assert.equal(await printed.evaluate("document.querySelectorAll('.qs-map-sheet').length"), 2);
  assert.equal(await printed.evaluate("document.querySelectorAll('.qs-map-sheet .map-target-pin,.qs-map-sheet .map-selected-cell').length"), 0);
  assert.equal(await printed.evaluate("document.querySelectorAll('.qs-map-sheet image[href*=labels]').length"), 0);
  const rawPrint = await (await fetch(`${base}/t/${europe.id}/quiz`)).text();
  assert.ok(!rawPrint.includes('mapLatitude') && !rawPrint.includes('mapLongitude'));
  await printed.screenshot(path.join(directory, "01-europe-team-pack.png"));
  await printed.send("Emulation.setEmulatedMedia", { media: "print" });
  await printed.send("Emulation.setDeviceMetricsOverride", { width: 794, height: 1123, deviceScaleFactor: 1, mobile: false });
  assert.equal(await printed.evaluate("[...document.querySelectorAll('.quiz-option-pool')].some(pool => pool.scrollWidth > pool.clientWidth + 2)"), false, "Long quiz options must stay inside their printed columns");
  await printed.send("Emulation.setEmulatedMedia", { media: "" });
  await printed.send("Emulation.clearDeviceMetricsOverride");
  const pdf = Buffer.from((await printed.send("Page.printToPDF", { printBackground: true, preferCSSPageSize: true })).data, "base64");
  await writeFile(path.join(directory, "europe-team-pack.pdf"), pdf);
  assert.equal((pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length, 4, "One quiz page and one map page per team");
  note("Printed pack is exactly four A4 PDF pages for two teams, with blank unlabelled maps and no target coordinates");
  const runUrl = `${base}/t/${europe.id}/run`, roomUrl = `${base}/t/${europe.id}/present`;
  const cursor = async () => (await db.query('SELECT "runStep","activePosition" FROM "Event" WHERE "id"=$1', [europe.id])).rows[0];
  const guesses = [["D5", "e 5"], ["D5", ""], ["A1", "E7"], ["F8", "G8"], ["C6", "C6"]];
  const bonuses = [[1, .5], [1, 0], [0, .5], [.5, 1], [1, 1]], totals = [0, 0];
  await room.navigate(roomUrl);
  for (let i = 0; i < 5; i++) {
    const wine = europe.wines[i];
    await host.navigate(runUrl); await host.waitText("Collect cards");
    await host.submit('.round-footer form', {}, "Team answers →");
    await host.waitText("What did each team pick?");
    const hidden = await (await fetch(roomUrl)).text();
    assert.ok(!hidden.includes(wine.name));
    assert.ok(!hidden.includes('map-target-pin'));
    const values = {};
    for (const team of europe.teams) for (const category of CATEGORIES) values[`t:${team.id}:${category}`] = String(optionOrder(europe.id, category, europe.wines).findIndex((w) => w.id === wine.id));
    europe.teams.forEach((team, ti) => { values[`m:${team.id}`] = guesses[i][ti]; });
    if (i === 0) {
      await host.evaluate("document.querySelector('form:has(input[name=fromStep])').noValidate=true");
      await host.submit('form:has(input[name=fromStep])', { ...values, [`m:${europe.teams[0].id}`]: "Z99" }, "Save answers");
      await host.waitText("That map square is not on this map.");
      assert.equal((await db.query('SELECT count(*) AS n FROM "TeamGuess"')).rows[0].n, "0");
      note("Invalid map cells are rejected atomically without saving a partial matching answer sheet");
      const mobile = await host.screenshot(path.join(directory, "02-europe-answer-entry-phone.png"), 390, 844);
      assert.ok(mobile.scroll <= mobile.width + 2);
      await host.send("Emulation.clearDeviceMetricsOverride");
    }
    await host.submit('form:has(input[name=fromStep])', values, "Save answers");
    await host.waitText("Team answers saved.");
    if (i === 0) assert.equal((await db.query('SELECT "cell" FROM "TeamMapGuess" WHERE "teamId"=$1 AND "wineId"=$2', [europe.teams[1].id, wine.id])).rows[0].cell, "E5");
    await host.submit('form:has(input[name=fromStep])', {}, `Save & reveal wine ${wine.position} →`);
    await host.waitText(wine.name);
    await room.waitText(wine.name);
    if (i === 0) {
      assert.ok(await room.evaluate("!!document.querySelector('.map-target-pin')"));
      await room.screenshot(path.join(directory, "03-europe-region-reveal.png"));
    }
    await host.submit('.round-footer form', {}, "Tasting results →"); await host.waitText("What did we make of it?");
    await host.submit('.round-footer form', {}, "Quiz results →"); await host.waitText("Correct answers");
    const perWine = await host.evaluate("[...document.querySelectorAll('.results-table tbody tr')].map(row=>({team:row.querySelector('th').textContent,points:row.querySelector('.points-cell').textContent}))");
    europe.teams.forEach((team, ti) => { assert.equal(perWine.find((row) => row.team === team.name).points, `${4 + bonuses[i][ti]} / 5`); totals[ti] += 4 + bonuses[i][ti]; });
    if (i === 0) {
      await room.waitText("Correct answers");
      assert.equal(await room.evaluate("document.querySelectorAll('.map-reveal-panel .map-team-pin').length"), 2);
      await room.screenshot(path.join(directory, "04-europe-map-guesses.png"));
      const mobile = await room.screenshot(path.join(directory, "05-europe-map-guesses-phone.png"), 390, 844);
      assert.ok(mobile.scroll <= mobile.width + 2); await room.send("Emulation.clearDeviceMetricsOverride");
    }
    await host.submit('.round-footer form', {}, "Standings →"); await host.waitText("Team standings");
    const standing = await host.evaluate("[...document.querySelectorAll('.standings-table tbody tr')].map(row=>({team:row.querySelector('th').childNodes[0].textContent,points:row.querySelector('.points-cell').childNodes[0].textContent}))");
    europe.teams.forEach((team, ti) => assert.equal(Number(standing.find((row) => row.team === team.name).points), totals[ti]));
    note(`Europe wine ${wine.position}: blank, exact and neighbour guesses score correctly in per-wine and cumulative results`);
    if (i < 4) {
      await host.submit('.round-footer form', {}, `Pour wine ${europe.wines[i + 1].position} →`);
      await until(async () => (await cursor()).activePosition === europe.wines[i + 1].position, "next wine");
    }
  }
  await host.navigate(`${base}/t/${europe.id}?tab=setup`);
  assert.equal(await host.evaluate("document.querySelector('select[name=mapMode]').disabled"), true);
  await host.navigate(`${runUrl}?wine=A&step=ANSWERS`); await host.waitText("What did each team pick?");
  await host.submit('form:has(input[name=fromStep])', { [`m:${europe.teams[0].id}`]: "" }, "Save answers");
  await host.waitText("Team answers saved.");
  assert.equal((await cursor()).activePosition, "E");
  assert.equal((await db.query('SELECT count(*) AS n FROM "TeamMapGuess" WHERE "wineId"=$1', [europe.wines[4].id])).rows[0].n, "2");
  await host.navigate(`${runUrl}?wine=A&step=STANDINGS`); await host.waitText("Team standings");
  const historical = await host.evaluate("[...document.querySelectorAll('.standings-table .points-cell')].map(cell=>cell.childNodes[0].textContent)");
  assert.deepEqual(historical, ["4.5", "4"]);
  note("Map area locks after answer collection; correcting an earlier map guess changes only the appropriate results and keeps the live cursor");

  const world = await createEvent("World map browser check", 2, "WORLD", ["Globetrotters"]);
  await db.query('UPDATE "Wine" SET "country"=\'New Zealand\' WHERE "eventId"=$1', [world.id]);
  await host.navigate(`${base}/t/${world.id}?tab=wines`);
  for (let i = 0; i < 2; i++) {
    const point = cellPoint("X9", "WORLD"), xy = mapPointToSvg(point, "WORLD"), grid = MAPS.WORLD;
    await host.evaluate(`(() => { const form=document.querySelectorAll('.map-target-editor form')[${i}]; form.closest('.wine-config').open=true; form.closest('details').open=true; const svg=form.querySelector('svg'); const b=svg.getBoundingClientRect(); svg.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:b.left+${xy.x / grid.width}*b.width,clientY:b.top+${xy.y / grid.height}*b.height})); })()`);
    await until(() => host.evaluate(`document.querySelectorAll('.map-target-editor input[aria-label="Map answer square"]')[${i}].value==='X9'`), "world target");
    await host.evaluate(`document.querySelectorAll('.map-target-editor form')[${i}].requestSubmit()`);
    await until(async () => (await db.query('SELECT "mapLatitude" FROM "Wine" WHERE "id"=$1', [world.wines[i].id])).rows[0].mapLatitude != null, "save world target");
    await host.navigate(`${base}/t/${world.id}?tab=wines`);
  }
  await printed.navigate(`${base}/t/${world.id}/quiz?maps=only`);
  assert.equal(await printed.evaluate("document.querySelectorAll('.qs-map-sheet').length"), 1);
  const worldPdf = Buffer.from((await printed.send("Page.printToPDF", { printBackground: true, preferCSSPageSize: true })).data, "base64");
  await writeFile(path.join(directory, "world-team-map.pdf"), worldPdf);
  assert.equal((worldPdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length, 1);
  await printed.screenshot(path.join(directory, "06-world-print-map.png"));
  let worldTotal = 0;
  for (let i = 0; i < 2; i++) {
    await host.navigate(`${base}/t/${world.id}/run`); await host.waitText("Collect cards");
    await host.submit('.round-footer form', {}, "Team answers →"); await host.waitText("What did each team pick?");
    assert.equal(await host.evaluate("document.querySelectorAll('select[name^=\"t:\"]').length"), 0);
    await host.submit('form:has(input[name=fromStep])', { [`m:${world.teams[0].id}`]: i ? "A9" : "X9" }, `Save & reveal wine ${world.wines[i].position} →`);
    await host.waitText(world.wines[i].name);
    await host.submit('.round-footer form', {}, "Tasting results →"); await host.waitText("What did we make of it?");
    await host.submit('.round-footer form', {}, "Quiz results →"); await host.waitText("Correct answers");
    assert.equal(await host.evaluate("document.querySelector('.points-cell').textContent"), `${i ? .5 : 1} / 1`);
    await host.submit('.round-footer form', {}, "Standings →"); await host.waitText("Team standings");
    worldTotal += i ? .5 : 1;
    assert.equal(await host.evaluate("Number(document.querySelector('.points-cell').childNodes[0].textContent)"), worldTotal);
    if (!i) { await host.submit('.round-footer form', {}, "Pour wine B →"); await host.waitText("Pour wine B and pass out the cards."); }
  }
  note("World map supports a New Zealand flight, map-only quizzes, one-page map printing and half points across the east–west seam");
  report.browserErrors = { host: host.errors, room: room.errors, printed: printed.errors };
  assert.equal(host.errors.length + room.errors.length + printed.errors.length, 0, JSON.stringify(report.browserErrors));
  assert.deepEqual((await admin.query('SELECT (SELECT count(*) FROM "Event") AS events,(SELECT count(*) FROM "Wine") AS wines,(SELECT count(*) FROM "Submission") AS cards')).rows[0], before);
  note("No browser exceptions; all pre-existing development tastings and cards are unchanged");
  passed = true;
} catch (error) {
  report.error = error.stack; console.error(error.stack); process.exitCode = 1;
  try { await host?.screenshot(path.join(directory, "failure.png")); } catch {}
} finally {
  browser?.close(); server?.kill("SIGTERM"); if (db) await db.end();
  if (passed) { await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()', [database]); await admin.query(`DROP DATABASE "${database}"`); }
  await admin.end();
  await writeFile(path.join(directory, "server.log"), log.replaceAll(testUrl.href, "[test database]"));
  report.passed = passed;
  await writeFile(path.join(directory, "report.json"), JSON.stringify(report, null, 2));
  console.log(`Map report, PDFs and screenshots: ${directory}`);
  if (!passed) console.log(`Failed test database kept: ${database}`);
}
