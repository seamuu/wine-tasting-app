// Complete browser/API check in a disposable LOCAL database. Never seeds,
// migrates or deletes rows in DATABASE_URL's existing database.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import pg from "pg";
import { loadTs } from "./load-ts.mjs";
import { availablePort, launchBrowser, until, delay } from "./lib/browser.mjs";

const originalUrl = new URL(process.env.DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1", "[::1]"].includes(originalUrl.hostname)) throw new Error("Browser checks require a local Postgres, never a remote database.");
const database = `codex_quiz_test_${Date.now()}`;
const testUrl = new URL(originalUrl); testUrl.pathname = `/${database}`;
const directory = await mkdtemp(path.join(os.tmpdir(), "wine-quiz-check-"));
const env = { ...process.env, DATABASE_URL: testUrl.href, NODE_ENV: "production" };
const admin = new pg.Client({ connectionString: originalUrl.href });
let db, server, browser, host, passed = false;
let serverLog = "";
const report = { directory, database, checks: [] };
const note = (message) => { report.checks.push(message); console.log(`✓ ${message}`); };
async function command(executable, args) {
  const child = spawn(executable, args, { env, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  child.stdout.on("data", (data) => { log += data; }); child.stderr.on("data", (data) => { log += data; });
  const code = await new Promise((resolve, reject) => { child.on("error", reject); child.on("exit", resolve); });
  if (code !== 0) throw new Error(log.replaceAll(testUrl.href, "[local test database]"));
}
const { CATEGORIES, optionOrder } = await loadTs("../lib/quiz.ts");
const { ID_SETS } = await loadTs("../lib/card.ts");
try {
  await admin.connect();
  const before = (await admin.query('SELECT (SELECT count(*) FROM "Event") AS events, (SELECT count(*) FROM "Wine") AS wines, (SELECT count(*) FROM "Submission") AS cards')).rows[0];
  await admin.query(`CREATE DATABASE "${database}"`);
  await command(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy", "--config", "prisma7.config.ts"]);
  note("All migrations apply to an empty isolated database");
  db = new pg.Client({ connectionString: testUrl.href }); await db.connect();
  const port = await availablePort(), base = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--port", String(port), "--hostname", "127.0.0.1"], { env, stdio: ["ignore", "pipe", "pipe"] });
  server.stdout.on("data", (data) => { serverLog += data; }); server.stderr.on("data", (data) => { serverLog += data; });
  await until(async () => (await fetch(base)).ok, "Next.js startup");
  browser = await launchBrowser(directory);
  host = await browser.page();
  const room = await browser.page();
  const phone = await browser.page();
  await host.navigate(base);
  await host.evaluate("document.querySelector('.demo-option').open=true");
  await host.clickText('button', 'Create demo tasting →');
  await until(async () => (await db.query('SELECT count(*) AS n FROM "Event"')).rows[0].n === '1', 'create practice event');
  await host.waitText('Collect cards');
  const practice = (await db.query('SELECT * FROM "Event"')).rows[0];
  assert.equal(practice.name, 'Demo tasting');
  assert.equal(practice.wineCount, 2);
  assert.equal(practice.guestCount, 2);
  assert.equal(practice.idSet, 'colours');
  assert.equal(practice.priceOnCard, false);
  assert.equal(practice.mapMode, 'OFF');
  assert.equal((await db.query('SELECT count(*) AS n FROM "Wine"')).rows[0].n, '2');
  assert.equal((await db.query('SELECT count(*) AS n FROM "Team"')).rows[0].n, '2');
  await host.navigate(`${base}/t/${practice.id}/run`);
  assert.equal(await host.evaluate("document.querySelectorAll('iframe').length"),0,'host dashboard must not embed the scanner');
  assert.equal(await host.evaluate("!!document.querySelector('.phone-connect-content img')"),true,'host offers a QR code');
  await phone.navigate(`${base}/t/${practice.id}/scan?wine=A`);
  await phone.send('Page.bringToFront');
  const practiceScanner = expression => phone.evaluate(`document.querySelector('iframe').contentWindow.eval(${JSON.stringify(expression)})`);
  await until(()=>practiceScanner('window.__mapReady===true && !!window.scanWizard'),'practice scanner ready');
  await phone.send('Page.setInterceptFileChooserDialog',{enabled:true});
  assert.equal((await db.query('SELECT count(*) AS n FROM "TeamGuess"')).rows[0].n,'16','demo includes team answers');
  const practiceStep = () => practiceScanner('document.documentElement.dataset.scanStep');
  assert.equal(await practiceStep(),'wine');
  assert.equal(await practiceScanner("[...document.querySelectorAll('[data-wizard-step]')].filter(panel=>!panel.hidden).length"),1);
  await practiceScanner("document.getElementById('wizardStart').click()");
  assert.equal(await practiceStep(),'capture');
  await practiceScanner("loadImage('/practice-cards/A-1.png')");
  await until(()=>practiceScanner('window.__cornersReady===true'),'practice card photo ready');
  await until(()=>practiceStep().then(step=>step==='summary'),'photo is read automatically');
  await until(()=>practiceScanner('!!window.__lastRun'),'practice card read');
  assert.equal((await db.query('SELECT count(*) AS n FROM "Submission"')).rows[0].n,'0','an actual scanned photo remains unsaved during review');
  assert.equal(await practiceStep(),'summary');
  await practiceScanner("document.getElementById('retryCardBtn').click()");
  assert.equal(await practiceStep(),'capture');
  assert.equal((await db.query('SELECT count(*) AS n FROM "Submission"')).rows[0].n,'0');
  await practiceScanner("loadImage('/practice-cards/A-1.png')");
  await until(()=>practiceScanner('window.__cornersReady===true'),'retake loaded');
  await until(()=>practiceStep().then(step=>step==='summary'),'retake read');
  await practiceScanner("document.getElementById('confirmBtn').click()");
  await until(()=>practiceScanner("!document.getElementById('nextCardBtn').hidden"),'practice card confirmed');
  await host.waitText('1/2 cards');
  const practiceCard = (await db.query('SELECT * FROM "Submission"')).rows[0];
  assert.equal(practiceCard.rating,8);
  assert.equal(practiceCard.body,2);
  await phone.send('Page.bringToFront');
  await practiceScanner('window.__testBeforeReload=true;location.reload()');
  await until(()=>practiceScanner('!window.__testBeforeReload && !!window.__lastRun'),'confirmed read restored');
  assert.equal(await practiceScanner("document.getElementById('nextCardBtn').hidden"),false);
  assert.equal((await db.query('SELECT count(*) AS n FROM "Submission"')).rows[0].n,'1');
  await phone.send('Page.bringToFront');
  await practiceScanner("document.getElementById('nextCardBtn').click()");
  assert.equal(await practiceStep(),'capture');
  await practiceScanner("loadImage('/practice-cards/A-2.png')");
  await until(()=>practiceScanner("window.__cornersReady===true && window.__lastRun?.groups?.find(group=>group.name==='Rating')?.value==='6' && document.documentElement.dataset.scanStep==='summary'"),'second practice reads automatically');
  await practiceScanner("document.getElementById('confirmBtn').click()");
  await until(()=>practiceScanner("document.getElementById('wizardSavedTitle').textContent==='All cards scanned' && document.documentElement.dataset.scanStep==='saved'"),'phone shows collection complete');
  await host.waitText('All cards collected');
  assert.equal(await host.evaluate("document.querySelectorAll('iframe').length"),0);
  const liveCollection = await (await fetch(`${base}/api/scan?eventId=${practice.id}&position=A`)).json();
  assert.equal(liveCollection.count,2);assert.equal(liveCollection.expected,2);
  assert.equal(JSON.stringify(liveCollection).includes('Practice white'),false,'live progress must not expose the bottle');
  await host.screenshot(path.join(directory,'00-host-all-cards.png'));
  note('Separate phone scanner and laptop dashboard sync live; all cards collected appears on both after the second confirmed practice card');

  // Missing names save as independent cards, while retries keep the same card.
  const unnamed = await practiceScanner('JSON.parse(JSON.stringify(window.__lastRun))');
  delete unnamed.scanId;
  unnamed.groups = unnamed.groups.map(g => g.name.toLowerCase() === 'you are' ? { ...g, value: null, flag: 'not marked' } : g);
  await practiceScanner(`window.__lastRun=${JSON.stringify(unnamed)};render(window.__lastRun)`);
  assert.equal(await practiceScanner("document.querySelector('#results').textContent.includes('Unnamed card')"), true);
  await practiceScanner("document.getElementById('confirmBtn').click()");
  await until(() => practiceScanner("document.documentElement.dataset.scanStep==='saved' && savedCount===3"), 'unnamed phone scan saved');
  const posted = await practiceScanner('JSON.parse(JSON.stringify(window.__lastRun))');
  const postUnnamed = async result => {
    const response = await fetch(`${base}/api/scan`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: practice.id, expectedPosition: 'A', result }) });
    assert.equal(response.status, 200);
    return response.json();
  };
  const retry = await postUnnamed(posted);
  assert.equal(retry.count, 3);
  assert.equal(retry.taster, 'Unnamed card');
  assert.ok(!retry.card.note?.includes('You are'));
  const second = await postUnnamed({ ...posted, scanId: crypto.randomUUID() });
  assert.equal(second.count, 4);
  assert.notEqual(second.card.id, retry.card.id);
  assert.equal((await postUnnamed(posted)).card.id, retry.card.id);
  assert.equal((await db.query('SELECT count(*) AS n FROM "Submission" WHERE "eventId"=$1', [practice.id])).rows[0].n, '4');
  note('Blank names save from the phone; separate unnamed cards and retry idempotency preserve the named cards');

  await host.navigate(`${base}/t/${practice.id}/run?wine=A&step=COLLECT&fix=${retry.card.id}`);
  await host.waitText('Fixing Unnamed card');
  await host.submit('#manual-card form', { rating: '9' }, 'File this card');
  await host.waitText('Tasting card saved.');
  assert.equal((await db.query('SELECT "rating" FROM "Submission" WHERE id=$1', [retry.card.id])).rows[0].rating, 9);
  assert.equal((await db.query('SELECT count(*) AS n FROM "Submission" WHERE "eventId"=$1', [practice.id])).rows[0].n, '4');
  note('Correcting an unnamed card requires no name and replaces the saved card');

  // Only this disposable fixture is cleared to exercise zero-card progression.
  await db.query('DELETE FROM "Submission" WHERE "eventId"=$1', [practice.id]);
  await host.navigate(`${base}/t/${practice.id}/run`);
  await host.waitText('0/2 cards');
  await host.waitText('You can continue now.');
  await host.submit('.round-footer form', {}, 'Team answers →');
  await host.waitText('What did each team pick?');
  assert.equal((await db.query('SELECT "runStep" FROM "Event" WHERE id=$1', [practice.id])).rows[0].runStep, 'ANSWERS');
  await host.submit('form:has(input[name=fromStep])', {}, 'Save & reveal wine A →');
  await host.waitText('Practice white (fictional)');
  for (const [label, nextLabel] of [
    ['Tasting results →', 'Quiz results →'], ['Quiz results →', 'Standings →'],
    ['Standings →', 'Pour wine B →'], ['Pour wine B →', 'Team answers →'],
  ]) {
    await host.submit('.round-footer form', {}, label);
    await until(() => host.evaluate(`[...document.querySelectorAll('.round-footer button')].some(b=>b.textContent===${JSON.stringify(nextLabel)}&&!b.disabled)`), 'next practice page');
  }
  await host.waitText('Pour wine B and pass out the cards.');
  await phone.navigate(`${base}/t/${practice.id}/scan?wine=B`);
  await phone.send('Page.bringToFront');
  await until(() => practiceScanner('window.__mapReady===true && !!window.scanWizard'), 'wine B scanner ready');
  await practiceScanner("loadImage('/practice-cards/B-1.png')");
  await until(() => practiceScanner("document.documentElement.dataset.scanStep==='summary' && !!window.__lastRun"), 'wine B card read');
  await practiceScanner("window.__lastRun.groups.forEach(g=>{if(g.name.toLowerCase()==='you are'){g.value=null;g.flag='not marked';}});render(window.__lastRun)");
  await practiceScanner("document.getElementById('confirmBtn').click()");
  await until(() => practiceScanner("document.documentElement.dataset.scanStep==='saved' && savedCount===1"), 'partial collection saved');
  assert.equal(await practiceScanner("[...document.querySelectorAll('#wizardSavedActions button')].some(b=>b.textContent==='Done'&&!b.hidden)"), true);
  await host.waitText('1/2 cards');
  await host.submit('.round-footer form', {}, 'Team answers →');
  await host.waitText('What did each team pick?');
  assert.equal((await db.query('SELECT "activePosition","runStep" FROM "Event" WHERE id=$1', [practice.id])).rows[0].runStep, 'ANSWERS');
  note('Zero-card and partial-card collections can continue; the phone offers Done before the expected total');

  const manualCursor = (await db.query('SELECT "activePosition","runStep" FROM "Event" WHERE id=$1', [practice.id])).rows[0];
  await phone.clickText('.phone-entry-nav a', 'Enter card manually');
  await until(() => phone.evaluate("!!document.querySelector('#manual-card[open] form') && !document.querySelector('iframe')"), 'direct phone manual entry');
  assert.equal(await phone.evaluate("document.querySelectorAll('input[name=rating]').length"), 10);
  assert.equal(await phone.evaluate("document.querySelectorAll('input[name=flavours]').length"), 90);
  const entryKey = await phone.evaluate("document.querySelector('input[name=scanId]').value");
  const mobileManual = await phone.screenshot(path.join(directory, 'manual-entry-phone.png'), 390, 844);
  assert.ok(mobileManual.scroll <= mobileManual.width + 2);
  assert.ok(await phone.evaluate("document.querySelector('#manual-card button[type=submit]').getBoundingClientRect().bottom<=innerHeight"), 'Save card stays visible while entering marks');
  await phone.evaluate("document.querySelector('input[name=flavours][value=\"Red fruit|Cherry\"]').checked=true");
  await phone.submit('#manual-card form', { rating: '8', body: '4', acidity: '3', tannin: '2', sweetness: '1', alcohol: '3' }, 'Save card');
  await phone.waitText('Card saved. Enter the next card below.');
  await until(() => phone.evaluate(`document.querySelector('input[name=scanId]').value!==${JSON.stringify(entryKey)}`), 'fresh form after saving');
  assert.ok(await phone.evaluate("!document.querySelector('input[name=rating]:checked')&&!document.querySelector('input[name=flavours]:checked')"));
  const manualB = (await db.query('SELECT s.* FROM "Submission" s JOIN "Wine" w ON w.id=s."wineId" WHERE w."eventId"=$1 AND w.position=\'B\' ORDER BY s."createdAt" DESC LIMIT 1', [practice.id])).rows[0];
  assert.equal(manualB.status, 'MANUAL');assert.equal(manualB.rating, 8);assert.equal(manualB.body, 4);
  assert.deepEqual(manualB.flavours, ['Red fruit|Cherry']);
  await phone.submit('#manual-card form', { rating: '9' }, 'Save card');
  await until(async () => (await db.query('SELECT count(*) AS n FROM "Submission" s JOIN "Wine" w ON w.id=s."wineId" WHERE w."eventId"=$1 AND w.position=\'B\'', [practice.id])).rows[0].n==='3', 'second unnamed manual card is independent');
  await until(() => phone.evaluate("!document.querySelector('input[name=rating]:checked')"), 'second form reset');
  await phone.submit('#manual-card form', { idA: 'Blue', idB: 'Fox', rating: '5' }, 'Save card');
  await until(async () => (await db.query('SELECT count(*) AS n FROM "Submission" s JOIN "Wine" w ON w.id=s."wineId" WHERE w."eventId"=$1 AND w.position=\'B\'', [practice.id])).rows[0].n==='4', 'named manual card');
  await until(() => phone.evaluate("!document.querySelector('input[name=idA]:checked')"), 'named form resets for the next person');
  await phone.submit('#manual-card form', { idA: 'Blue', idB: 'Fox', rating: '6' }, 'Save card');
  await until(async () => (await db.query('SELECT s.rating FROM "Submission" s JOIN "Taster" t ON t.id=s."tasterId" WHERE t."eventId"=$1 AND t."idA"=\'Blue\' AND t."idB"=\'Fox\'', [practice.id])).rows[0].rating===6, 'named manual correction replaces its card');
  const manualStatus = await (await fetch(`${base}/api/scan?eventId=${practice.id}&position=B`)).json();
  assert.equal(manualStatus.count,4);
  assert.deepEqual((await db.query('SELECT "activePosition","runStep" FROM "Event" WHERE id=$1', [practice.id])).rows[0], manualCursor);
  assert.ok(!(await (await fetch(`${base}/t/${practice.id}/scan?wine=B&mode=manual`)).text()).includes('Practice red (fictional)'), 'Manual entry keeps the bottle hidden');
  await host.navigate(`${base}/t/${practice.id}/run?wine=B&step=COLLECT`);
  await host.waitText('All cards collected');
  assert.ok(await host.evaluate("[...document.querySelectorAll('.collection-panel > a')].some(a=>a.textContent.includes('Enter card manually')&&a.getBoundingClientRect().height>0)"), 'Laptop manual entry stays visible after collection');
  note('Direct phone and laptop manual entry: optional names, all tasting fields, independent cards, fresh forms, mobile controls and unchanged live cursor');

  // Correct a partial photo reading before its first save, keeping good values.
  await phone.clickText('.phone-entry-nav a', 'Scan a card');
  await phone.send('Page.bringToFront');
  await until(() => practiceScanner('window.__mapReady===true && !!window.scanWizard'), 'review editor scanner ready');
  await practiceScanner("loadImage('/practice-cards/B-2.png')");
  await until(() => practiceScanner("document.documentElement.dataset.scanStep==='summary'&&!!window.__lastRun"), 'review editor card read');
  const goodRead = await practiceScanner('JSON.parse(JSON.stringify(window.__lastRun))');
  const bodyRead = goodRead.groups.find(g => g.name === 'Body').value;
  assert.ok(bodyRead);
  const additionIndex = goodRead.groups.findIndex(g => g.kind === 'many' && g.reads.some(r => !g.value.includes(r.label)));
  const additionLabel = goodRead.groups[additionIndex].reads.find(r => !goodRead.groups[additionIndex].value.includes(r.label)).label;
  const partial = { ...goodRead, groups: goodRead.groups.map(g => ({ ...g, flag: null,
    value: ['Wine','Rating','You are'].includes(g.name) ? null : g.name === 'Acidity' ? '1' : g.value })) };
  await practiceScanner(`window.__lastRun=${JSON.stringify(partial)};render(window.__lastRun);document.getElementById('editReadings').click()`);
  assert.equal(await practiceScanner("document.getElementById('readingEditor').hidden"), false);
  assert.equal(await practiceScanner("document.getElementById('wizardSummaryPhoto').src.startsWith('data:image/')"), true);
  assert.equal((await db.query('SELECT count(*) AS n FROM "Submission" s JOIN "Wine" w ON w.id=s."wineId" WHERE w."eventId"=$1 AND w.position=\'B\'', [practice.id])).rows[0].n, '4', 'Editing must not save anything yet');
  for (const [field, value] of [['Wine','B'], ['Rating','9'], ['Acidity','4']]) {
    await practiceScanner(`(() => {const index=window.__lastRun.groups.findIndex(g=>g.name===${JSON.stringify(field)});const option=window.__lastRun.groups[index].reads.findIndex(r=>r.label===${JSON.stringify(value)});document.querySelector('#readingEditor input[data-group="'+index+'"][value="'+option+'"]').click();})()`);
  }
  await practiceScanner(`(() => {const option=window.__lastRun.groups[${additionIndex}].reads.findIndex(r=>r.label===${JSON.stringify(additionLabel)});document.querySelector('#readingEditor input[data-group="${additionIndex}"][value="'+option+'"]').click();})()`);
  await phone.screenshot(path.join(directory,'edit-scan-readings-mobile.png'),390,844);
  assert.ok(await phone.evaluate("document.querySelector('iframe').contentWindow.document.documentElement.scrollWidth<=document.querySelector('iframe').contentWindow.innerWidth"));
  await practiceScanner("document.getElementById('confirmBtn').click()");
  await until(() => practiceScanner("document.documentElement.dataset.scanStep==='saved'&&savedCount===5"), 'corrected partial scan saved');
  const corrected = (await db.query('SELECT s.* FROM "Submission" s JOIN "Wine" w ON w.id=s."wineId" WHERE w."eventId"=$1 AND w.position=\'B\' ORDER BY s."createdAt" DESC LIMIT 1', [practice.id])).rows[0];
  assert.equal(corrected.status,'MANUAL');assert.equal(corrected.rating,9);assert.equal(corrected.acidity,4);assert.equal(corrected.body,Number(bodyRead));
  for(const g of goodRead.groups.filter(g=>g.kind==='many')) for(const value of g.value) assert.ok(corrected.flavours.includes(`${g.name}|${value}`));
  assert.ok(corrected.flavours.includes(`${goodRead.groups[additionIndex].name}|${additionLabel}`));
  assert.equal(await practiceScanner("document.getElementById('editReadings').hidden"),true);
  assert.deepEqual((await db.query('SELECT "activePosition","runStep" FROM "Event" WHERE id=$1', [practice.id])).rows[0],manualCursor);
  note('Scan review corrections fill missing wine/rating and wrong structure/aromas, preserve good readings, and save only after confirmation');
  await db.query('DELETE FROM "Event" WHERE id=$1', [practice.id]);
  note('Create a separate scanner practice tasting with matching two-wine sample-card settings');
  await host.navigate(base);
  await host.submit('form', { name: "Browser test · five blind wines" }, "Create tasting →");
  await until(async () => (await db.query('SELECT count(*) AS n FROM "Event"')).rows[0].n === "1", "create event");
  const eventId = (await db.query('SELECT "id" FROM "Event"')).rows[0].id;
  const eventPath = `/t/${eventId}`;
  await host.waitText("Your teams");
  assert.equal(await host.evaluate("document.querySelectorAll('.setup-flow aside').length"),0);
  assert.equal(await host.evaluate("document.querySelectorAll('details[name=tasting-setup][open]').length"),1);
  await host.screenshot(path.join(directory,"setup-single-column.png"));
  await host.submit('form:has(input[name=wineCount]), form:has(select[name=wineCount])', { wineCount: "5", mapMode: "OFF" }, "Save & continue →");
  await until(async () => (await db.query('SELECT "wineCount" FROM "Event"')).rows[0].wineCount === 5, "save five wines");
  for (const [name, size] of [["Corks", 2], ["Grapes", 3]]) {
    await host.submit('form.team-form:not(:has(input[name=teamId]))', { name, memberCount: String(size) }, "Add team");
    await until(async () => (await db.query('SELECT count(*) AS n FROM "Team" WHERE "name"=$1', [name])).rows[0].n === "1", `add ${name}`);
    await until(() => host.evaluate(`[...document.querySelectorAll('form.team-form input[name=name]')].some(input => input.defaultValue === ${JSON.stringify(name)})`), `render team ${name}`);
  }
  assert.equal((await db.query('SELECT "guestCount" FROM "Event"')).rows[0].guestCount, 5);
  note("Create tasting, set five wines, add teams and derive guest count through the UI");
  await host.submit('form.team-form:not(:has(input[name=teamId]))', { name: "Corks", memberCount: "4" }, "Add team");
  await host.waitText("That team name is already in use.");
  assert.equal((await db.query('SELECT count(*) AS n FROM "Team"')).rows[0].n, "2");
  assert.equal((await db.query('SELECT "guestCount" FROM "Event"')).rows[0].guestCount, 5);
  note("Duplicate team names show a recoverable error and keep the guest count intact");
  await host.navigate(`${base}${eventPath}?tab=wines`);
  const names = ["Secret Chablis A", "Secret Sauvignon B", "Secret Gamay C", "Secret Primitivo D", "Secret Sauternes E"];
  for (let i = 0; i < 5; i++) {
    const position = String.fromCharCode(65 + i);
    await host.submit('form:has(input[name=sourceUrl])', { name: names[i], position, side: i === 2 || i === 3 ? "RED" : "WHITE" }, "Add to the flight");
    await until(async () => (await db.query('SELECT count(*) AS n FROM "Wine"')).rows[0].n === String(i + 1), `add wine ${position}`);
    await host.waitText(names[i]);
    await delay(100);
  }
  note("Add all five bottles through the UI without replacing any existing letter");
  const fixture = JSON.parse(await readFile(new URL("./fixtures/polet-chablis.json", import.meta.url), "utf8")).product;
  for (let i = 0; i < 5; i++) await db.query('UPDATE "Wine" SET "priceNok"=$1,"country"=$2,"appellation"=$3,"grapes"=$4,"tastingNote"=$5,"bodyRaw"=$6,"acidRaw"=$7,"sweetRaw"=$8,"smell"=$9,"taste"=$10,"foodPairing"=$11,"grapeNotes"=$12,"keyBody"=3,"keyAcidity"=4,"keySweetness"=1 WHERE "position"=$13',
    [150 + i * 20, `Country ${i}`, `Appellation ${i}`, ["Chardonnay 100%", "Sauvignon Blanc 100%", "Gamay 100%", "Primitivo 100%", "Sémillon 80%, Sauvignon Blanc 20%"][i], `Note unique to wine ${i}.`, 6 + i, 9 - i, i === 4 ? 10 : 1, fixture.smell, fixture.taste, ["Fisk", "Ost"], JSON.stringify(fixture.content.ingredients.map((g) => ({ name: g.name, about: g.description, share: g.formattedValue }))), String.fromCharCode(65 + i)]);
  const wines = (await db.query('SELECT * FROM "Wine" ORDER BY "position"')).rows;
  const teams = (await db.query('SELECT * FROM "Team" ORDER BY "name"')).rows;
  await host.navigate(`${base}${eventPath}?tab=setup`);
  await host.evaluate("document.getElementById('setup-print').open=true;document.querySelector('.setup-checklist').open=true");
  await host.waitText("4 quiz categories ready");
  const printed = await browser.page();
  await printed.navigate(`${base}${eventPath}/quiz`);
  assert.equal(await printed.evaluate("document.querySelectorAll('.qs-sheet').length"), 2);
  await printed.waitText("Corks"); await printed.waitText("Grapes");
  assert.equal(await printed.evaluate("document.body.innerText.includes('Secret Chablis')"), false);
  note("Printed quiz uses the configured team names and all four categories without naming bottles");
  const runUrl = `${base}${eventPath}/run`, roomUrl = `${base}${eventPath}/present`;
  await host.navigate(runUrl); await room.navigate(roomUrl);
  assert.equal(await host.evaluate("document.body.innerText.includes('Secret Chablis')"), false);
  const hiddenHtml = await (await fetch(roomUrl)).text();
  assert.ok(!names.some((name) => hiddenHtml.includes(name)), "Unrevealed names must not be sent in the room HTML/RSC payload");
  const futureHtml = await (await fetch(`${roomUrl}?wine=E&step=REVEAL`)).text();
  assert.ok(!futureHtml.includes(names[4]));
  note("Host scan view and room payload hide identities, including direct future-result URLs");
  const who = Array.from({ length: 5 }, (_, i) => ({ idA: ID_SETS.house.a[0], idB: ID_SETS.house.b[i % ID_SETS.house.b.length], extra: i >= ID_SETS.house.b.length }));
  who.forEach((person) => { if (person.extra) person.idA = ID_SETS.house.a[1]; });
  const scanResult = (position, side, person, value) => ({ side, groups: [
    { name: "Wine", kind: "one", value: position, flag: null },
    { name: "You are", kind: "one", value: person.idA, flag: null },
    { name: "You are", kind: "one", value: person.idB, flag: null },
    ...["Body", "Acidity", "Sweetness", "Alcohol"].map((name) => ({ name, kind: "one", value: "3", flag: null })),
    { name: "Rating", kind: "one", value: String(value), flag: null },
    { name: "Citrus fruit", kind: "many", value: ["Lemon"], flag: null },
  ] });
  const postScan = async (position, person, value, expectedPosition = position) => {
    const side = wines.find((w) => w.position === position).side.toLowerCase();
    const response = await fetch(`${base}/api/scan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, expectedPosition, result: scanResult(position, side, person, value) }) });
    return { response, data: await response.json() };
  };
  const mismatch = await postScan("B", who[0], 5, "A");
  assert.equal(mismatch.response.status, 422);
  assert.equal((await db.query('SELECT count(*) AS n FROM "Submission"')).rows[0].n, "0");
  note("A card for another wine is rejected by the per-wine scanner endpoint");
  const totals = [0, 0], correctCounts = [[4, 2], [2, 4], [3, 1], [0, 4], [4, 3]];
  const cursor = async () => (await db.query('SELECT "runStep", "activePosition" FROM "Event"')).rows[0];
  let firstWineQr;
  for (let wi = 0; wi < wines.length; wi++) {
    const wine = wines[wi], position = wine.position;
    await host.navigate(runUrl);
    assert.deepEqual(await cursor(), { runStep: "COLLECT", activePosition: position });
    await host.waitText(`Pour wine ${position} and pass out the cards.`);
    const phoneLink = await host.evaluate("document.querySelector('.phone-link a').href");
    assert.equal(new URL(phoneLink).searchParams.get('wine'),position,'each wine has its own scanner URL');
    const currentQr = await host.evaluate("document.querySelector('.phone-connect-content img').src");
    if(wi===0)firstWineQr=currentQr;
    if(wi===1){
      assert.notEqual(currentQr,firstWineQr,'different wines produce different QR codes');
      await phone.navigate(`${base}${eventPath}/scan?wine=A`);
      assert.equal(await phone.evaluate("new URL(document.querySelector('iframe').src).searchParams.get('expectedPosition')"),'A','wine A scanner stays pinned after the host moves to B');
      await host.send('Page.bringToFront');
    }
    for (let pi = 0; pi < who.length; pi++) {
      if (wi === 0 && pi === 0) {
        assert.equal(await host.evaluate("document.querySelectorAll('iframe').length"),0,'laptop shows collection, not a scanner');
        await phone.navigate(`${base}${eventPath}/scan?wine=${position}`);
        await phone.send('Page.bringToFront');
        const reading = scanResult(position, "white", who[pi], 6);
        reading.groups.forEach(group => { group.reads = []; });
        reading.threshold = { hi: 0.6, lo: 0.4 };
        await until(() => phone.evaluate("document.querySelector('iframe').contentWindow.__mapReady === true"), "scanner iframe ready");
        await phone.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
        const inScanner = expression => phone.evaluate(`document.querySelector('iframe').contentWindow.eval(${JSON.stringify(expression)})`);
        await inScanner(`window.__lastRun=${JSON.stringify(reading)};document.getElementById('dstCanvas').width=700;document.getElementById('dstCanvas').height=1000;render(window.__lastRun);document.getElementById('results').scrollIntoView()`);
        assert.equal((await db.query('SELECT count(*) AS n FROM "Submission"')).rows[0].n, '0', 'reviewing a read must not save it');
        assert.equal(await inScanner("document.getElementById('nextCardBtn').hidden"),true);
        await phone.send('Network.enable');
        const hostRefreshes = [], saveRequests = [];
        phone.socket.addEventListener('message', event => {
          const message = JSON.parse(event.data);
          if (message.method !== 'Network.requestWillBeSent') return;
          if (message.params.request.url.endsWith('/api/scan')) saveRequests.push(message.params.request.url);
          if (message.params.request.url.includes(`${eventPath}/scan`) &&
              (message.params.type === 'Document' || message.params.request.url.includes('_rsc='))) hostRefreshes.push(message.params.request.url);
        });
        await inScanner("window.__scanPersistenceMarker='keep the current read';document.getElementById('confirmBtn').click();document.getElementById('confirmBtn').click()");
        await until(async () => (await db.query('SELECT count(*) AS n FROM "Submission"')).rows[0].n === "1", "confirm saves one card");
        await until(()=>inScanner("document.getElementById('wizardSavedCount').textContent.includes('1/5 cards')"),"phone count updated");
        await until(()=>inScanner("!document.getElementById('nextCardBtn').hidden"),'next card offered after save');
        await delay(300);
        assert.equal(await inScanner("window.__scanPersistenceMarker"), 'keep the current read');
        assert.equal(saveRequests.length,1,'one confirmation must make exactly one save request, including a double tap');
        assert.equal(await inScanner('document.documentElement.dataset.scanStep'),'saved','confirmation opens only the saved screen');
        assert.equal(await inScanner('scrollY'),0);
        assert.equal(hostRefreshes.length,0,'confirmation must not refresh the host route');
        await phone.screenshot(path.join(directory,'00-confirmed-card-phone.png'),390,844);
        // A failed save keeps the review, offers retry and never offers Next.
        await inScanner("window.__realFetch=window.fetch;render(window.__lastRun);window.fetch=async()=>({ok:false,json:async()=>({ok:false,error:'Test connection failure'})});document.getElementById('confirmBtn').click()");
        await until(()=>inScanner("document.getElementById('filed').textContent.includes('Test connection failure')"),'failed save explained');
        assert.equal(await inScanner("document.getElementById('confirmBtn').disabled"),false);
        assert.equal(await inScanner("document.getElementById('nextCardBtn').hidden"),true);
        await inScanner("window.fetch=window.__realFetch;document.getElementById('confirmBtn').click()");
        await until(()=>inScanner("!document.getElementById('nextCardBtn').hidden"),'retry succeeds');
        assert.equal((await db.query('SELECT count(*) AS n FROM "Submission"')).rows[0].n,'1','retry replaces the same card');
        // Next opens the photo picker; selecting a photo starts a fresh review.
        let chooserOpened = false;
        phone.socket.addEventListener('message',event=>{if(JSON.parse(event.data).method==='Page.fileChooserOpened')chooserOpened=true;});
        await phone.send('Page.setInterceptFileChooserDialog',{enabled:true});
        await inScanner("document.getElementById('nextCardBtn').click()");
        assert.equal(await inScanner('document.documentElement.dataset.scanStep'),'capture');
        // Next opens the native camera/photo picker immediately.
        await until(()=>chooserOpened,'capture button opens photo picker');
        const input = await phone.send('Runtime.evaluate',{expression:"document.querySelector('iframe').contentDocument.getElementById('file')"});
        await phone.send('DOM.setFileInputFiles',{objectId:input.result.objectId,files:[path.resolve('public/practice-cards/A-2.png')]});
        await until(()=>inScanner("!!window.__lastRun && document.documentElement.dataset.scanStep==='summary'"),'next photo reads automatically into its own review');
        assert.equal(await inScanner("document.querySelectorAll('[data-wizard-step=summary] img').length"),1);
        assert.equal((await db.query('SELECT count(*) AS n FROM "Submission"')).rows[0].n,'1');
        await phone.send('Page.setInterceptFileChooserDialog',{enabled:false});
        await phone.send('Emulation.clearDeviceMetricsOverride');
        await host.waitText("1/5 cards");
        note("Phone wizard: one screen at a time, explicit confirmation, safe retry and retake, then a fresh capture screen for the next card");

      } else {
        const saved = await postScan(position, who[pi], 6 - wi + pi);
        assert.equal(saved.data.ok, true);
        assert.equal(saved.data.wine, `Wine ${position}`);
      }
    }
    // A re-read replaces, rather than duplicates, a person's card.
    await postScan(position, who[0], 6 - wi);
    assert.equal((await db.query('SELECT count(*) AS n FROM "Submission" WHERE "wineId"=$1', [wine.id])).rows[0].n, "5");
    await host.navigate(runUrl); await host.waitText("5/5 cards");
    if (wi === 0) {
      const desktop = await host.screenshot(path.join(directory, "01-host-collect-desktop.png"));
      assert.ok(desktop.scroll <= desktop.width + 2);
      const mobile = await host.screenshot(path.join(directory, "02-host-collect-mobile.png"), 390, 844);
      assert.ok(mobile.scroll <= mobile.width + 2, "Collect screen must fit a phone");
      await host.send("Emulation.clearDeviceMetricsOverride");
    }
    // Capture the actual progressive-enhancement action form for a stale replay.
    const staleForm = await host.evaluate("Array.from(new FormData(document.querySelector('.round-footer form')).entries())");
    await host.submit('.round-footer form', {}, "Team answers →");
    await until(async () => (await cursor()).runStep === "ANSWERS", `answer step ${position}`);
    await host.waitText("What did each team pick?");
    if (wi === 0) {
      const replay = new FormData(); for (const [key, value] of staleForm) replay.append(key, value);
      const response = await fetch(runUrl, { method: "POST", headers: { Origin: base }, body: replay, redirect: "manual" });
      assert.equal(response.status, 303);
      assert.ok(response.headers.get("location").includes("notice=stale"));
      assert.equal((await cursor()).runStep, "ANSWERS");
      note("Replaying the previous step's form does not skip a step or reveal a bottle");
    }
    const entries = {};
    for (let ti = 0; ti < teams.length; ti++) for (let ci = 0; ci < CATEGORIES.length; ci++) {
      const category = CATEGORIES[ci], order = optionOrder(eventId, category, wines);
      const chosen = ci < correctCounts[wi][ti] ? wine : wines[(wi + 1) % wines.length];
      entries[`t:${teams[ti].id}:${category}`] = String(order.findIndex((w) => w.id === chosen.id));
    }
    await host.submit('form:has(input[name=fromStep])', entries, "Save answers");
    await host.waitText("Team answers saved.");
    assert.equal((await cursor()).runStep, "ANSWERS");
    assert.equal((await db.query('SELECT "stage" FROM "Wine" WHERE "id"=$1', [wine.id])).rows[0].stage, "LOCKED");
    if (wi > 0) assert.equal((await db.query('SELECT count(*) AS n FROM "TeamGuess" WHERE "wineId"=$1', [wines[wi - 1].id])).rows[0].n, "8");
    if (wi === 0) {
      const mobile = await host.screenshot(path.join(directory, "03-host-answers-mobile.png"), 390, 844);
      assert.ok(mobile.scroll <= mobile.width + 2, "Answer entry must fit a phone");
      await host.send("Emulation.clearDeviceMetricsOverride");
    }
    await host.submit('form:has(input[name=fromStep])', {}, `Save & reveal wine ${position} →`);
    await until(async () => (await cursor()).runStep === "REVEAL", `reveal ${position}`);
    await host.waitText(wine.name);
    await room.waitText(wine.name); // Proves automatic cross-tab follow.
    if (wi === 0) {
      await room.screenshot(path.join(directory, "04-room-wine-story.png"));
      assert.ok(!(await (await fetch(roomUrl)).text()).includes(names[1]));
      note("Save & reveal publishes only the current bottle and the room follows automatically");
    }
    await host.submit('.round-footer form', {}, "Tasting results →");
    await until(async () => (await cursor()).runStep === "TASTING", `tasting ${position}`);
    await host.waitText("What did we make of it?");
    if(wi===0) assert.equal(await host.evaluate("getComputedStyle(document.querySelector('.reference-tick')).backgroundColor"),'rgb(23, 76, 107)');
    await host.waitText(`${(8 - wi).toFixed(1)}`);
    if (wi === 0) {
      await room.waitText("What did we make of it?");
      await room.screenshot(path.join(directory, "07-room-tasting-desktop.png"));
      const mobile = await room.screenshot(path.join(directory, "08-room-tasting-mobile.png"), 390, 844);
      assert.ok(mobile.scroll <= mobile.width + 2, "Tasting charts must fit a phone");
      await room.send("Emulation.clearDeviceMetricsOverride");
    }
    await host.submit('.round-footer form', {}, "Quiz results →");
    await until(async () => (await cursor()).runStep === "QUIZ", `quiz ${position}`);
    await host.waitText("Correct answers");
    assert.equal(await host.evaluate("[...document.querySelectorAll('.actual-answer')].some(answer=>answer.textContent.startsWith('kr '))"),true,'price is shown as money, not a numbered option');
    if (wi === 0) {
      await room.waitText("Correct answers");
      await room.screenshot(path.join(directory, "09-room-quiz-results.png"));
    }
    const scores = await host.evaluate("[...document.querySelectorAll('.results-table tbody tr')].map(row=>({team:row.querySelector('th').textContent,score:row.querySelector('.points-cell').textContent}))");
    for (let ti = 0; ti < teams.length; ti++) assert.equal(scores.find((s) => s.team === teams[ti].name).score, `${correctCounts[wi][ti]} / 4`);
    await host.submit('.round-footer form', {}, "Standings →");
    await until(async () => (await cursor()).runStep === "STANDINGS", `standings ${position}`);
    await host.waitText("Team standings");
    correctCounts[wi].forEach((n, ti) => { totals[ti] += n; });
    const cumulative = await host.evaluate("[...document.querySelectorAll('.standings-table tbody tr')].map(row=>({team:row.querySelector('th').childNodes[0].textContent,score:row.querySelector('.points-cell').childNodes[0].textContent}))");
    for (let ti = 0; ti < teams.length; ti++) assert.equal(Number(cumulative.find((s) => s.team === teams[ti].name).score), totals[ti]);
    assert.equal(await host.evaluate("document.querySelectorAll('.comparison-grid .card').length"), wi + 1);
    note(`Wine ${position}: scans, saved team answers, four result pages and cumulative scores verified`);
    if (wi === 4) {
      await room.waitText("Team standings");
      await room.screenshot(path.join(directory, "05-final-room-standings.png"));
      const mobile = await host.screenshot(path.join(directory, "06-final-standings-mobile.png"), 390, 844);
      assert.ok(mobile.scroll <= mobile.width + 2, "Standings must not overflow the phone viewport");
      await host.send("Emulation.clearDeviceMetricsOverride");
      await host.waitText("Tasting complete");
    } else {
      const nextPosition = wines[wi + 1].position;
      await host.submit('.round-footer form', {}, `Pour wine ${nextPosition} →`);
      await until(async () => (await cursor()).activePosition === nextPosition, `next wine ${nextPosition}`);
    }
  }
  // Revisiting early summaries must not retroactively include later results.
  await host.navigate(`${runUrl}?wine=A&step=STANDINGS`);
  await host.waitText("Live page: Wine E · Standings");
  assert.equal(await host.evaluate("document.querySelectorAll('.comparison-grid .card').length"), 1);
  assert.equal((await cursor()).activePosition, "E");
  note("Historical summaries stop at their wine and do not move the live cursor");
  await host.navigate(`${runUrl}?wine=A&step=ANSWERS`);
  await host.waitText("What did each team pick?");
  await host.submit('form:has(input[name=fromStep])', { [`t:${teams[0].id}:PRICE`]: "" }, "Save answers");
  await host.waitText("Team answers saved.");
  assert.equal((await cursor()).activePosition, "E");
  assert.equal((await cursor()).runStep, "STANDINGS");
  assert.equal((await db.query('SELECT count(*) AS n FROM "TeamGuess" WHERE "wineId"=$1', [wines[0].id])).rows[0].n, "7");
  assert.equal((await db.query('SELECT count(*) AS n FROM "TeamGuess" WHERE "wineId"=$1', [wines[4].id])).rows[0].n, "8");
  await host.navigate(`${runUrl}?wine=A&step=QUIZ`);
  await host.evaluate("document.querySelector('.quiz-answer-detail').open=true");
  await host.waitText("No answer");
  note("An earlier team answer can be cleared or corrected without changing later answers or the live cursor");
  const correctionId = (await db.query('SELECT s.id FROM "Submission" s JOIN "Taster" t ON t.id=s."tasterId" WHERE s."wineId"=$1 AND t."idA"=$2 AND t."idB"=$3', [wines[0].id, who[0].idA, who[0].idB])).rows[0].id;
  await host.navigate(`${runUrl}?wine=A&step=COLLECT&fix=${correctionId}`);
  await host.waitText(`Fixing ${who[0].idA} ${who[0].idB}`);
  assert.equal(await host.evaluate("document.querySelectorAll('iframe').length"),0,'manual corrections do not bring back the scanner on the host');
  await host.evaluate("document.querySelector('#manual-card').open = true");
  await host.submit('#manual-card form', { idA: who[0].idA, idB: who[0].idB, rating: "9" }, "File this card");
  await host.waitText("Tasting card saved.");
  assert.equal((await db.query('SELECT count(*) AS n FROM "Submission" WHERE "wineId"=$1', [wines[0].id])).rows[0].n, "5");
  assert.equal((await cursor()).activePosition, "E");
  note("Manual correction of an earlier card replaces it and keeps the current round");
  await host.navigate(`${base}${eventPath}?tab=setup`);
  assert.equal(await host.evaluate("document.querySelector('select[name=wineCount]').disabled"), true);
  assert.equal(await host.evaluate("document.querySelector('select[name=idSet]').disabled"), true);
  note("Printed flight and card settings are fixed after collection starts");
  await host.navigate(`${base}${eventPath}?tab=results`);
  await host.waitText("Compare wines");
  assert.equal(await host.evaluate("document.querySelectorAll('.comparison-grid .card').length"), 5);
  assert.deepEqual((await admin.query('SELECT (SELECT count(*) FROM "Event") AS events, (SELECT count(*) FROM "Wine") AS wines, (SELECT count(*) FROM "Submission") AS cards')).rows[0], before);
  assert.equal(host.errors.length + phone.errors.length + room.errors.length + printed.errors.length, 0, "No uncaught browser exceptions");
  note("Full results render, no browser exceptions, original development tastings unchanged");
  await writeFile(path.join(directory, "server.log"), serverLog.replaceAll(testUrl.href, "[local test database]"));
  passed = true;
} catch (error) {
  try { await host?.screenshot(path.join(directory, "failure.png")); } catch {}
  report.error = error.stack;
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  browser?.close(); server?.kill("SIGTERM");
  if (db) await db.end();
  if (passed) {
    await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()', [database]);
    await admin.query(`DROP DATABASE "${database}"`);
  }
  await admin.end();
  await writeFile(path.join(directory, "server.log"), serverLog.replaceAll(testUrl.href, "[local test database]"));
  report.passed = passed;
  await writeFile(path.join(directory, "report.json"), JSON.stringify(report, null, 2));
  console.log(`Report and screenshots: ${directory}`);
  if (!passed) console.log(`Failed-run test database retained for inspection: ${database}`);
}
