/**
 * lib/flavours.ts duplicates the aroma vocabulary printed on public/card-v2.html.
 * The card is the source of truth — the scanner reads its DOM — so this script
 * re-parses the card and fails if the copy has drifted.
 *
 *   node scripts/check-vocab.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const card = readFileSync(join(root, "public/card-v2.html"), "utf8");
const lib = readFileSync(join(root, "lib/flavours.ts"), "utf8");

/** Pull every flavorBox("Name", ["a","b",...]) out of one side's template block. */
function fromCard(side) {
  const start = card.indexOf(side === "WHITE" ? "${isWhite ? `" : "` : `");
  const end = side === "WHITE" ? card.indexOf("` : `", start) : card.indexOf("`}", start);
  const block = card.slice(start, end);
  const out = [];
  for (const m of block.matchAll(/flavorBox\("([^"]+)",\s*\[([^\]]+)\]\)/g)) {
    out.push([m[1], m[2].match(/"([^"]+)"/g).map((s) => s.slice(1, -1))]);
  }
  return out;
}

/** And every { name: "...", tier: "...", options: [...] } out of the library. */
function fromLib(constName) {
  const start = lib.indexOf(`const ${constName}: Category[] = [`);
  const block = lib.slice(start, lib.indexOf("\n];", start));
  const out = [];
  for (const m of block.matchAll(/name:\s*"([^"]+)",\s*tier:\s*"[^"]+",\s*options:\s*\[([^\]]+)\]/g)) {
    out.push([m[1], m[2].match(/"([^"]+)"/g).map((s) => s.slice(1, -1))]);
  }
  return out;
}

let failed = 0;
for (const [side, constName] of [["WHITE", "WHITE"], ["RED", "RED"]]) {
  const a = fromCard(side);
  const b = fromLib(constName);
  const show = (x) => x.map(([n, o]) => `${n}: ${o.join(", ")}`).join("\n");
  if (a.length === 0) {
    console.error(`✗ ${side}: could not parse the card — the template shape changed`);
    failed = 1;
    continue;
  }
  if (show(a) !== show(b)) {
    console.error(`✗ ${side} vocabulary differs between the card and lib/flavours.ts`);
    const av = show(a).split("\n"), bv = show(b).split("\n");
    for (let i = 0; i < Math.max(av.length, bv.length); i++) {
      if (av[i] !== bv[i]) console.error(`   card: ${av[i] ?? "—"}\n    lib: ${bv[i] ?? "—"}`);
    }
    failed = 1;
  } else {
    console.log(`✓ ${side}: ${a.length} categories, ${a.reduce((n, [, o]) => n + o.length, 0)} options`);
  }
}
process.exit(failed);
