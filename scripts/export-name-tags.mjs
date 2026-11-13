// One A4 sheet with the eight assigned Imeto Julebord identities. No DB writes.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { launchBrowser } from "./lib/browser.mjs";
import { loadTs } from "./load-ts.mjs";

const { ID_SETS } = await loadTs("../lib/card.ts");
const names = JSON.parse(await readFile(new URL("../lib/imeto-name-tags.json", import.meta.url), "utf8"));
assert.equal(names.length, 8);
assert.equal(new Set(names.map(p => `${p.colour} ${p.animal}`)).size, 8);
for (const p of names) {
  assert.ok(ID_SETS.colours.a.includes(p.colour));
  assert.ok(ID_SETS.colours.b.includes(p.animal));
}
const escape = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const colours = { Red: "#a84849", Blue: "#587d9b", Yellow: "#b28d31", Green: "#758b5e", Orange: "#bc7748" };
const output = path.resolve("artifacts/imeto-julebord");
const published = path.resolve("public/print/imeto-julebord/name-badges.pdf");
await mkdir(output, { recursive: true });
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Imeto Julebord · assigned name tags</title><style>
*{box-sizing:border-box}html,body{margin:0}body{font-family:Arial,sans-serif;color:#29201a;background:white}
@page{size:A4 portrait;margin:10mm}.sheet{width:190mm;height:277mm}.header{height:22mm;border-bottom:1px solid #d6cbbb;padding-bottom:4mm}
.header h1{font:600 22pt Georgia,serif;margin:0 0 2mm}.header p{font:9pt Arial,sans-serif;margin:0;color:#6b5a4e}
.tags{height:255mm;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(4,1fr);border:1px dashed #b6aa98}
.tag{padding:6mm 7mm;display:flex;flex-direction:column;justify-content:space-between;border-bottom:1px dashed #b6aa98;border-right:1px dashed #b6aa98;background:#fffdf8}
.tag:nth-child(2n){border-right:0}.tag:nth-last-child(-n+2){border-bottom:0}
.person{font:600 23pt Georgia,serif;margin:0}.identity{font:600 22pt Georgia,serif;display:flex;align-items:center;gap:3mm;margin:3mm 0}
.dot{display:block;flex:none;width:4mm;height:4mm;border-radius:50%;background:var(--colour)}
.hint{font:8.5pt/1.5 Arial,sans-serif;color:#6b5a4e;margin:0}.hint b{color:#29201a}
@media screen{body{padding:10mm;background:#f7f2e9}.sheet{background:white}}
@media print{*{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style></head><body><main class="sheet"><header class="header"><h1>Imeto Julebord</h1><p>Optional name tags. If you use one, keep the same pair for all six wines. Cut along the dotted lines.</p></header><div class="tags">${names.map(p => `<section class="tag" style="--colour:${colours[p.colour]}"><h2 class="person">${escape(p.name)}</h2><div class="identity"><i class="dot"></i><span>${p.colour} ${p.animal}</span></div><p class="hint">If using this name, fill <b>${p.colour}</b> + <b>${p.animal}</b><br>under <b>You are</b> on each tasting card.</p></section>`).join("")}</div></main></body></html>`;
const source = path.join(output, "name-tags.html");
await writeFile(source, html);
const browser = await launchBrowser(await mkdtemp("/tmp/imeto-name-tags-"));
try {
  const page = await browser.page();
  await page.navigate(pathToFileURL(source).href);
  await page.evaluate("document.fonts.ready");
  assert.equal(await page.evaluate("document.querySelectorAll('.tag').length"), 8);
  assert.ok(await page.evaluate("[...document.querySelectorAll('.tag')].every(t=>t.scrollWidth<=t.clientWidth&&t.scrollHeight<=t.clientHeight)"));
  const result = await page.send("Page.printToPDF", { printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false });
  const pdf = path.join(output, "name-badges.pdf");
  await writeFile(pdf, Buffer.from(result.data, "base64"));
  await copyFile(pdf, published);
  await page.screenshot(path.join(output, "assigned-name-tags.png"), 794, 1123);
  assert.equal(page.errors.length, 0);
  console.log(`Created ${pdf}: eight assigned name tags.`);
} finally { browser.close(); }
