import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../lib/vinmonopolet.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { parsePoletHtml, draftKey } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
// Product JSON captured from /p/668001 on 2026-11-12; no network required.
const fixture = JSON.parse(await readFile(new URL("./fixtures/polet-chablis.json", import.meta.url), "utf8"));
const url = "https://www.vinmonopolet.no/p/668001";
const script = (value) => `<script>${JSON.stringify(value)}</script>`;
const wine = parsePoletHtml(script(fixture), url);
assert.equal(wine.grapes, "Chardonnay 100%");
assert.equal(wine.grapeNotes[0].name, "Chardonnay");
assert.ok(wine.grapeNotes[0].about.length > 20);
assert.deepEqual(wine.foodPairing, ["Aperitiff", "Skalldyr", "Fisk"]);
assert.equal(wine.alcohol, 12);
assert.equal(wine.sugarGl, 3);
assert.equal(wine.acidGl, 5.9);
assert.equal(wine.priceNok, 245);
assert.equal(wine.vintage, 2025);
assert.equal(wine.appellation, "Chablis");
assert.equal(wine.sourceRef, "668001");
assert.equal(wine.bodyRaw, 6);
assert.equal(wine.acidRaw, 9);
assert.equal(wine.tastingNote, `${wine.smell} ${wine.taste}`);
assert.equal(draftKey(wine).keyAcidity, 4);
assert.equal(draftKey(wine).keyBody, 3);
assert.equal(draftKey(wine).keySweetness, 1);

const malformed = '<script>{"product": invalid}</script>';
assert.deepEqual(parsePoletHtml(malformed + script(fixture), url), wine);
const broken = structuredClone(fixture);
broken.product.content.characteristics = [{ name: "Fylde", value: "99" }];
broken.product.content.ingredients = {};
broken.product.content.isGoodFor = [null, 7];
const partial = parsePoletHtml(script(broken), url);
assert.equal(partial.bodyRaw, undefined);
assert.equal(partial.grapes, undefined);
assert.equal(partial.alcohol, 12);

const fallback = parsePoletHtml(`${malformed}<title>Fallback 2022 | Vinmonopolet</title>
  <dt>Alkohol</dt><dd>13,5 %</dd><dt>Lukt</dt><dd>Eple.</dd>`, url);
assert.equal(fallback.name, "Fallback 2022");
assert.equal(fallback.vintage, 2022);
assert.equal(fallback.alcohol, 13.5);
assert.equal(fallback.tastingNote, "Eple.");
const staleLd = '<script type="application/ld+json">{"name":"Old name","offers":{"price":1}}</script>';
assert.equal(parsePoletHtml(script(fixture) + staleLd, url).priceNok, 245);
console.log("Vinmonopolet parser checks passed (live fixture, malformed data, HTML fallback, source priority).");
