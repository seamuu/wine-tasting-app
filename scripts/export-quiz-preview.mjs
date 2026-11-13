// Export the reviewed paper pack from the running local app. No database writes.
// node scripts/export-quiz-preview.mjs <eventId> [output-directory]
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { launchBrowser } from './lib/browser.mjs';
const eventId = process.argv[2];
if (!eventId || !/^[\w-]+$/.test(eventId)) throw new Error('Pass a tasting ID');
const base = process.env.APP_URL ?? 'http://localhost:3000';
const output = path.resolve(process.argv[3] ?? 'artifacts/quiz-preview');
const temp = await mkdtemp(path.join(tmpdir(), 'wine-clue-export-'));
const command = promisify(execFile);
const browser = await launchBrowser(temp);
try {
  await mkdir(output, { recursive: true });
  const page = await browser.page();
  await page.navigate(`${base}/t/${eventId}/quiz-preview`);
  await page.waitText('Price master');
  await page.evaluate('document.fonts.ready');
  await page.evaluate('Promise.all(Array.from(document.images).map(image => image.decode()))');
  assert.equal(await page.evaluate("document.querySelectorAll('.clue-sheet').length"), 4);
  const text = await page.evaluate('document.body.innerText');
  assert.ok(text.includes('Final call if you disagree.'));
  assert.ok(!text.toLowerCase().includes('coordinator'));
  assert.ok(text.includes('18 possible points.'));
  assert.equal(await page.evaluate("document.querySelectorAll('.clue-person div:last-child').length"), 1);
  assert.equal(await page.evaluate("document.querySelectorAll('.clue-team-table tbody tr').length"), 6);
  const headings = await page.evaluate("Array.from(document.querySelectorAll('.clue-sheet h2')).map(h => h.textContent)");
  assert.deepEqual(headings, ['The team’s answers', 'Map master', 'Aroma master', 'Price master']);
  // Guard against spilling one person's sheet across two physical pages.
  const all = await page.send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false });
  const testPdf = path.join(temp, 'team-pack.pdf');
  await writeFile(testPdf, Buffer.from(all.data, 'base64'));
  const { stdout: info } = await command('pdfinfo', [testPdf]);
  assert.match(info, /Pages:\s+4\b/);
  const pdfText = await command('pdftotext', ['-layout', testPdf, '-']);
  const pages = pdfText.stdout.split('\f').filter(p => p.trim());
  headings.forEach((heading, i) => assert.ok(pages[i].includes(heading), `Sheet ${i + 1} fits its own A4 page`));
  await writeFile(path.join(output, 'team-pack.pdf'), Buffer.from(all.data, 'base64'));
  const exports = [
    ['quiz-pack.pdf', '1,3-4'],
    ['quiz-answer-sheet.pdf', '1'],
    ['cheat-sheets.pdf', '2-4'],
    ['map-master.pdf', '2'], ['aroma-master.pdf', '3'],
    ['price-master.pdf', '4'],
  ];
  for (const [file, pageRanges] of exports) {
    const pdf = await page.send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false, pageRanges });
    await writeFile(path.join(output, file), Buffer.from(pdf.data, 'base64'));
  }
  for (const [id, file] of [
    ['answer-sheet', 'quiz-sheet.png'], ['france-map', 'france-grid.png'],
    ['reference-note', 'tasting-note-sheet.png'], ['reference-price', 'price-sheet.png'],
  ]) {
    const clip = await page.evaluate(`(() => { const r = document.getElementById(${JSON.stringify(id)}).getBoundingClientRect(); return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}; })()`);
    const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip });
    await writeFile(path.join(output, file), Buffer.from(shot.data, 'base64'));
  }
  assert.equal(page.errors.length, 0, JSON.stringify(page.errors));
  // Remove obsolete illustrations of the retired grape question / cut-up cards.
  await rm(path.join(output, 'grape-sheet.png'), { force: true });
  await rm(path.join(output, 'reference-cards.png'), { force: true });
  await rm(path.join(output, 'coordinator.pdf'), { force: true });
  await rm(path.join(output, 'coordinator-sheet.png'), { force: true });
  console.log('Four A4 pages verified; three question-master sheets, no coordinator.');
} finally {
  browser.close();
}
