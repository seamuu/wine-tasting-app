/**
 * What to expect from a wine, and why.
 *
 * Everything here is derived from things the Vinmonopolet listing actually
 * states — the grapes, the appellation, and the measured alcohol, sugar and
 * acid — plus a table of what those grapes and places are known for. Nothing is
 * invented about the specific bottle: if we have no entry for a grape, the
 * wine simply gets fewer lines rather than a confident guess.
 *
 * The point is that a tasting is more fun with the story attached. "Raisin and
 * fig" is a fact about the glass; "because the grapes were dried on mats for
 * months before pressing" is the bit people remember.
 */

export type Fact = { head: string; body: string };

type Entry = { aromas: string[]; because: string };

/** Grape → what it typically shows, and the reason. */
const GRAPES: Record<string, Entry> = {
  "sauvignon blanc": { aromas: ["grapefruit", "nettle", "cut grass", "elderflower"],
    because: "its thiols and pyrazines — the same compounds that make blackcurrant leaf smell green" },
  "chardonnay": { aromas: ["apple", "lemon", "hazelnut"],
    because: "a fairly neutral grape, so it mostly shows what the winemaker did to it" },
  "riesling": { aromas: ["lime", "green apple", "wet stone", "petrol with age"],
    because: "very high natural acidity, and TDN develops in the bottle as it ages" },
  "pinot grigio": { aromas: ["pear", "lemon", "almond"], because: "picked early for freshness" },
  "pinot gris": { aromas: ["pear", "quince", "honey"], because: "picked riper than its Italian twin" },
  "gewürztraminer": { aromas: ["lychee", "rose", "ginger"], because: "unusually high terpene levels" },
  "chenin blanc": { aromas: ["quince", "honey", "chamomile"], because: "high acid that carries sweetness well" },
  "viognier": { aromas: ["apricot", "blossom", "peach"], because: "terpenes again, and it needs full ripeness" },
  "albariño": { aromas: ["lemon", "salt", "peach"], because: "grown in sight of the Atlantic" },
  "grüner veltliner": { aromas: ["white pepper", "celery", "lime"], because: "rotundone, the pepper compound" },
  "sémillon": { aromas: ["wax", "lemon", "toast"], because: "low aromatics young, remarkable with age" },
  "garganega": { aromas: ["almond", "blossom", "lemon"], because: "the Soave grape, gentle and nutty" },
  "verdicchio": { aromas: ["lemon", "almond", "fennel"], because: "a bitter almond finish is its signature" },
  "muscat": { aromas: ["grape", "orange blossom", "rose"], because: "the one grape that smells like grapes" },
  "cabernet sauvignon": { aromas: ["blackcurrant", "cedar", "graphite"],
    because: "thick skins give deep colour and firm tannin, and pyrazines give the leafy edge" },
  "merlot": { aromas: ["plum", "black cherry", "chocolate"], because: "softer tannin and earlier ripening" },
  "pinot noir": { aromas: ["cherry", "raspberry", "forest floor"],
    because: "thin skins — pale, perfumed, and it picks up everything from the site" },
  "syrah": { aromas: ["blackberry", "black pepper", "olive"], because: "rotundone gives it the pepper" },
  "shiraz": { aromas: ["blackberry", "liquorice", "sweet spice"], because: "the same grape, grown warmer and riper" },
  "grenache": { aromas: ["strawberry", "white pepper", "dried herbs"], because: "ripens late and to high sugar, hence the alcohol" },
  "tempranillo": { aromas: ["cherry", "leather", "tobacco"], because: "long American-oak ageing is the tradition" },
  "sangiovese": { aromas: ["sour cherry", "tomato leaf", "tea"], because: "high acid and grippy tannin" },
  "nebbiolo": { aromas: ["rose", "tar", "cherry"], because: "pale in colour but ferocious in tannin — the great contradiction" },
  "corvina": { aromas: ["sour cherry", "almond"], because: "the backbone of Valpolicella" },
  "corvinone": { aromas: ["dark cherry", "spice"], because: "bigger berries, deeper colour" },
  "rondinella": { aromas: ["red fruit"], because: "a reliable blender rather than a star" },
  "malbec": { aromas: ["plum", "violet", "cocoa"], because: "thick skins at altitude" },
  "carignan": { aromas: ["cranberry", "tar", "herbs"], because: "old vines and high acid" },
  "cinsault": { aromas: ["raspberry", "rose"], because: "light and perfumed, usually a blending softener" },
  "mourvèdre": { aromas: ["blackberry", "game", "earth"], because: "it needs real heat to ripen, and turns savoury" },
  "gamay": { aromas: ["banana", "cherry", "violet"], because: "carbonic maceration, which makes those bubblegum notes" },
  "zinfandel": { aromas: ["jammy fruit", "raisin", "sweet spice"], because: "ripens unevenly, so raisins end up in the ferment" },
  "primitivo": { aromas: ["jammy fruit", "fig", "spice"], because: "the same grape as Zinfandel, grown hot" },
  "barbera": { aromas: ["sour cherry", "plum"], because: "high acid, low tannin" },
  "touriga nacional": { aromas: ["violet", "blackberry", "bergamot"], because: "Portugal's finest, floral and firm" },
  "nerello mascalese": { aromas: ["red cherry", "ash", "herbs"], because: "grown on volcanic soil on Etna" },
  "pinotage": { aromas: ["plum", "smoke", "coffee"], because: "a South African crossing, often given heavy oak" },
};

/** Appellations and styles with a reason of their own, checked before grapes. */
const STYLES: { match: RegExp; label: string; aromas: string[]; because: string }[] = [
  { match: /amarone/i, label: "Amarone", aromas: ["raisin", "fig", "cocoa", "dried cherry"],
    because: "the grapes are dried on mats for months before pressing, which concentrates the sugar — that is where the raisin, the weight and the high alcohol all come from" },
  { match: /ripasso/i, label: "Ripasso", aromas: ["cherry", "spice", "dried fruit"],
    because: "the wine is re-passed over Amarone skins, borrowing some of that richness" },
  { match: /sancerre|pouilly.fum/i, label: "Upper Loire Sauvignon", aromas: ["flint", "grapefruit", "nettle"],
    because: "flinty soils, and picked to keep the acid taut" },
  { match: /chablis/i, label: "Chablis", aromas: ["lemon", "oyster shell", "chalk"],
    because: "Kimmeridgian limestone full of fossil shell, and usually no new oak at all" },
  { match: /rioja/i, label: "Rioja", aromas: ["vanilla", "coconut", "leather", "cherry"],
    because: "years in American oak, which gives vanilla and coconut rather than the clove of French oak" },
  { match: /barolo|barbaresco/i, label: "Piedmont Nebbiolo", aromas: ["rose", "tar", "dried cherry"],
    because: "Nebbiolo grown on marl, then aged long enough for the tannin to unclench" },
  { match: /champagne|cava|crémant|franciacorta/i, label: "Traditional-method sparkling",
    aromas: ["brioche", "biscuit", "apple"],
    because: "a second fermentation in the bottle, then years on the dead yeast, which is what makes the bready note" },
  { match: /sherry|jerez|fino|oloroso/i, label: "Sherry", aromas: ["almond", "brine", "yeast"],
    because: "fortified and aged under a film of living yeast" },
  { match: /port|porto/i, label: "Port", aromas: ["blackberry", "raisin", "spirit warmth"],
    because: "fermentation stopped with grape spirit, leaving sugar behind" },
  { match: /beaujolais/i, label: "Beaujolais", aromas: ["cherry", "banana", "violet"],
    because: "whole-bunch carbonic fermentation" },
  { match: /rhône|châteauneuf|gigondas/i, label: "Southern Rhône", aromas: ["strawberry", "garrigue herbs", "pepper"],
    because: "Grenache ripened hard on stony ground" },
  { match: /mosel|rheingau|rheinhessen/i, label: "German Riesling", aromas: ["lime", "slate", "green apple"],
    because: "slate soils and a cold climate, so the acid stays high" },
];

/** Split "Corvina 40%, Corvinone 20%" into grape names we can look up. */
export function grapeList(grapes: string | null | undefined): string[] {
  if (!grapes) return [];
  return grapes
    .split(/[,;/]|\band\b|\bog\b/i)
    .map((g) => g.replace(/\d+([.,]\d+)?\s*%?/g, "").replace(/\s+/g, " ").trim().toLowerCase())
    .filter((g) => g.length > 2);
}

export type Wineish = {
  name: string;
  grapes: string | null;
  appellation: string | null;
  region: string | null;
  country: string | null;
  alcohol: unknown;
  sugarGl: unknown;
  acidGl: unknown;
  tastingNote: string | null;
};

const num = (v: unknown) => {
  if (v == null) return null;
  const n = Number(String(v));
  return Number.isFinite(n) ? n : null;
};

/**
 * The three or four things worth saying out loud about a wine, each one
 * traceable to something the listing said.
 */
export function dossier(w: Wineish): { style: string | null; expect: string[]; facts: Fact[] } {
  const facts: Fact[] = [];
  const expect = new Set<string>();
  const haystack = [w.name, w.appellation, w.region].filter(Boolean).join(" ");

  const style = STYLES.find((s) => s.match.test(haystack));
  if (style) {
    style.aromas.forEach((a) => expect.add(a));
    facts.push({ head: style.label, body: style.because });
  }

  // grapes, most-listed first, but never more than two reasons
  const named = grapeList(w.grapes);
  let used = 0;
  for (const g of named) {
    const hit = GRAPES[g] ?? Object.entries(GRAPES).find(([k]) => g.includes(k))?.[1];
    if (!hit) continue;
    hit.aromas.forEach((a) => expect.add(a));
    if (used < 2 && !style) { facts.push({ head: titled(g), body: hit.because }); used += 1; }
    else if (used < 1 && style) { facts.push({ head: titled(g), body: hit.because }); used += 1; }
  }

  const alcohol = num(w.alcohol), sugar = num(w.sugarGl), acid = num(w.acidGl);

  if (alcohol != null) {
    facts.push({
      head: `${alcohol}% alcohol`,
      body: alcohol >= 15 ? "big enough to feel warm at the back of your throat, and it will read as body"
        : alcohol >= 14 ? "full-bodied, from properly ripe fruit"
        : alcohol >= 12.5 ? "middling weight — neither light nor heavy"
        : "light, which usually means it was picked early or grown somewhere cold",
    });
  }

  if (sugar != null) {
    facts.push({
      head: `${sugar} g/l sugar`,
      body: sugar < 4 ? "technically bone dry, whatever your tongue tells you — ripe fruit often reads as sweetness"
        : sugar < 12 ? "off-dry: just enough sugar to notice"
        : sugar < 45 ? "properly sweet" : "dessert-sweet",
    });
  }

  if (acid != null) {
    facts.push({
      head: `${acid} g/l acid`,
      body: acid >= 6.5 ? "high — it will make your mouth water, and it is what keeps the wine feeling fresh"
        : acid >= 5.5 ? "fresh, with enough grip to hold the fruit up"
        : "soft, so the wine will feel round rather than zippy",
    });
  }

  return { style: style?.label ?? null, expect: [...expect].slice(0, 8), facts: facts.slice(0, 5) };
}

const titled = (s: string) => s.replace(/(^|\s)\w/g, (m) => m.toUpperCase());
