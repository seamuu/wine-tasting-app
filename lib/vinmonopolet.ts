/**
 * Pull a wine's facts from a Vinmonopolet product page.
 *
 * Worth doing rather than reading a label photo: the Polet publishes the price,
 * which is the answer to the price round, plus measured sugar and acid, which
 * turn two of the answer-key's structure scores from a judgement into a fact.
 *
 * The page embeds product JSON alongside JSON-LD and a specification table.
 * We prefer the full product JSON and fall back to JSON-LD and labelled rows,
 * because a missing field should leave a blank for the host to fill rather than
 * a guess.
 */

export type GrapeNote = { name: string; share: string; about: string };

export type PoletWine = {
  name?: string;
  producer?: string;
  vintage?: number;
  priceNok?: number;
  alcohol?: number;
  sugarGl?: number;
  acidGl?: number;
  country?: string;
  region?: string;
  appellation?: string;
  grapes?: string;
  tastingNote?: string;
  sourceRef?: string;
  sourceUrl: string;

  // --- from the page's embedded product JSON ---
  colour?: string;
  smell?: string;
  taste?: string;
  /** Vinmonopolet's sensory ratings, each out of twelve. */
  bodyRaw?: number;
  acidRaw?: number;
  tanninRaw?: number;
  sweetRaw?: number;
  /** "Storfe", "Skalldyr", "Ost" - what they say it goes with. */
  foodPairing?: string[];
  /** Their written explanation of each grape, which is teaching copy for free. */
  grapeNotes?: GrapeNote[];
  storage?: string;
};

/**
 * Every product page carries a <script> holding the whole product as JSON:
 * grapes with percentages, body/acidity/tannin as numbers, food pairings, and
 * Vinmonopolet's own written explanation of each grape and each measurement.
 *
 * Reading that instead of scraping the rendered page fixes two things at once.
 * The grape list was never reliably in the HTML at all — which is why a whole
 * flight came back with no grapes — and the structure answer key stopped being
 * inferred from the alcohol percentage and became their measurement.
 *
 * The scrape below is kept as a fallback: this blob is undocumented and may
 * move, and a wine that loses its pairings is better than a lookup that dies.
 */
function fromProductJson(html: string, out: PoletWine): void {
  let product: Record<string, unknown> | undefined;
  // A page can contain unrelated or malformed scripts before the product.
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const block = match[1];
    if (!block.includes('"product"')) continue;
    try {
      const parsed = JSON.parse(block.slice(block.indexOf("{"), block.lastIndexOf("}") + 1));
      const candidate = record(record(parsed)?.product);
      if (candidate && (typeof candidate.name === "string" || record(candidate.content))) {
        product = candidate;
        break;
      }
    } catch { /* Keep looking; HTML fallbacks still work without product JSON. */ }
  }
  if (!product) return;

  const text = (v: unknown) => (typeof v === "string" && v.trim() ? clean(v) : undefined);
  const named = (v: unknown) => (v && typeof v === "object" && "name" in v
    ? text((v as { name: unknown }).name) : undefined);

  out.name ??= text(product.name);
  out.colour ??= text(product.color);
  out.smell ??= text(product.smell);
  out.taste ??= text(product.taste);
  out.producer ??= named(product.main_producer);
  out.country ??= named(product.main_country);
  out.region ??= named(product.district);
  out.appellation ??= named(product.sub_District);
  out.priceNok ??= num(String((product.price as { value?: unknown })?.value ?? ""));
  out.alcohol ??= num(String((product.alcohol as { value?: unknown })?.value ?? ""));
  const year = text(product.year);
  if (year && /^(19|20)\d{2}$/.test(year)) out.vintage ??= parseInt(year, 10);

  const content = record(product.content);
  if (!content) return;

  // Fylde / Friskhet / Garvestoffer / Sodme, each out of twelve
  const slot: Record<string, "bodyRaw" | "acidRaw" | "tanninRaw" | "sweetRaw"> = {
    "fylde": "bodyRaw", "friskhet": "acidRaw", "garvestoffer": "tanninRaw", "sødme": "sweetRaw",
  };
  for (const ch of records(content.characteristics)) {
    const key = slot[(text(ch.name) ?? "").toLowerCase()];
    const value = num(String(ch.value ?? ""));
    if (key && value != null && Number.isInteger(value) && value >= 1 && value <= 12)
      out[key] = value;
  }

  const traits: Record<string, "alcohol" | "sugarGl" | "acidGl"> = {
    alkohol: "alcohol", sukker: "sugarGl", syre: "acidGl",
  };
  for (const trait of records(content.traits)) {
    const key = traits[(text(trait.name) ?? "").toLowerCase()];
    const value = num(text(trait.formattedValue));
    if (key && value != null) out[key] ??= value;
  }

  const grapes = records(content.ingredients);
  if (grapes.length) {
    out.grapes ??= grapes.map((g) => text(g.formattedValue) ?? text(g.name) ?? "").filter(Boolean).join(", ");
    out.grapeNotes ??= grapes
      .filter((g) => text(g.name))
      .map((g) => ({
        name: text(g.name)!,
        share: text(g.formattedValue) ?? text(g.name)!,
        about: text(g.description) ?? "",
      }));
  }

  const food = records(content.isGoodFor).map((f) => text(f.name) ?? "").filter(Boolean);
  if (food.length) out.foodPairing ??= food;

  out.storage ??= text((content.storagePotential as { formattedValue?: unknown })?.formattedValue);
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.flatMap((item) => record(item) ? [record(item)!] : []) : [];
}

const num = (s: string | undefined): number | undefined => {
  if (!s) return undefined;
  // Norwegian decimals use a comma, and "Under 3 g/l" should read as 3
  const m = s.replace(/\s/g, "").match(/-?\d+(?:[.,]\d+)?/);
  return m ? parseFloat(m[0].replace(",", ".")) : undefined;
};

const clean = (s: string) =>
  s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
   .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();

/** Find "<label>…<value>" pairs in the specification list, whatever tags wrap them. */
function labelled(html: string, label: string): string | undefined {
  const re = new RegExp(
    `${label}\\s*<\\/[^>]+>\\s*(?:<[^>]+>\\s*){0,3}([^<]{1,120})`, "i");
  const m = html.match(re);
  return m ? clean(m[1]) || undefined : undefined;
}

/** Only ever fetch the Polet: this takes a URL from a form, so it must not be
 *  turned into a way to make the server request arbitrary hosts. */
export function isPoletUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && /(^|\.)vinmonopolet\.no$/.test(u.hostname);
  } catch { return false; }
}

export type PoletHit = {
  code: string;
  name: string;
  url: string;
  priceNok?: number;
  alcohol?: number;
  category?: string;   // "Rødvin", "Hvitvin", ...
  district?: string;
  volumeCl?: number;
  thumb?: string;
  side?: "RED" | "WHITE";
};

/**
 * Search the Polet by name, so a wine can be added without leaving the app.
 *
 * This is the storefront's own search endpoint — the one their website calls —
 * and it needs no key. Their documented API does, and asking the host to
 * register for one to look up a bottle is a worse trade than depending on this.
 * If it ever stops answering, pasting a product link still works.
 */
export async function searchPolet(query: string, limit = 8): Promise<PoletHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = "https://www.vinmonopolet.no/vmpws/v2/vmp/products/search"
    + `?query=${encodeURIComponent(q)}&pageSize=${Math.min(24, limit)}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      "Accept": "application/json",
      "Accept-Language": "nb-NO,nb;q=0.9,en;q=0.8",
    },
    next: { revalidate: 60 * 60 },
  });
  if (!res.ok) throw new Error(`Vinmonopolet search returned ${res.status}`);

  const data = await res.json() as { products?: Record<string, unknown>[] };
  const val = (o: unknown) => (o && typeof o === "object" && "value" in o
    ? Number((o as { value: unknown }).value) : undefined);
  const nameOf = (o: unknown) => (o && typeof o === "object" && "name" in o
    ? String((o as { name: unknown }).name) : undefined);

  return (data.products ?? []).slice(0, limit).map((p) => {
    const category = nameOf(p.main_category);
    return {
      code: String(p.code ?? ""),
      name: String(p.name ?? "Unnamed"),
      // the listing gives a site-relative path that already ends in /p/<code>
      url: `https://www.vinmonopolet.no${String(p.url ?? "")}`,
      priceNok: val(p.price),
      alcohol: val(p.alcohol),
      category,
      district: nameOf(p.district),
      volumeCl: val(p.volume),
      thumb: Array.isArray(p.images) && p.images[0] && typeof p.images[0] === "object"
        ? String((p.images[0] as { url?: unknown }).url ?? "") || undefined
        : undefined,
      // enough to pre-pick the right side of the card; the host can override
      side: (category === "Rødvin" ? "RED"
        : category && /hvitvin|musserende|rosé|rosevin/i.test(category) ? "WHITE"
        : undefined) as PoletHit["side"],
    };
  }).filter((h) => h.code);
}

export async function fetchPolet(url: string): Promise<PoletWine> {
  if (!isPoletUrl(url)) throw new Error("That is not a vinmonopolet.no link");
  const res = await fetch(url, {
    headers: {
      // the storefront serves a stub to obvious bots
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      "Accept-Language": "nb-NO,nb;q=0.9,en;q=0.8",
    },
    // a listing changes rarely, and a tasting hits the same wine repeatedly
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) throw new Error(`Vinmonopolet returned ${res.status}`);
  const html = await res.text();

  return parsePoletHtml(html, url);
}

/** Parse a saved page as well as a live response, without needing network access. */
export function parsePoletHtml(html: string, url: string): PoletWine {
  const out: PoletWine = { sourceUrl: url };

  out.sourceRef = url.match(/\/p\/(\d+)/)?.[1];

  fromProductJson(html, out);

  // --- JSON-LD fills gaps left by the full product JSON ---
  for (const block of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(block[1]);
      const node = Array.isArray(data) ? data.find((d) => d.name) : data;
      if (!node) continue;
      if (typeof node.name === "string") out.name ??= clean(node.name);
      if (node.brand?.name) out.producer ??= clean(node.brand.name);
      const price = node.offers?.price ?? node.offers?.[0]?.price;
      if (price != null) out.priceNok ??= num(String(price));
    } catch { /* a malformed block is not worth failing the whole lookup over */ }
  }

  if (!out.name) {
    const t = html.match(/<title>([^<]+)<\/title>/i)?.[1];
    if (t) out.name = clean(t.replace(/\s*[|–-]\s*Vinmonopolet.*$/i, ""));
  }

  // --- specification rows ---
  out.priceNok  ??= num(labelled(html, "Pris"));
  out.alcohol   ??= num(labelled(html, "Alkohol"));
  out.sugarGl   ??= num(labelled(html, "Sukker"));
  out.acidGl    ??= num(labelled(html, "Syre"));
  out.country   ??= labelled(html, "Land");
  out.region    ??= labelled(html, "Distrikt");
  out.appellation ??= labelled(html, "Underdistrikt");
  out.grapes    ??= labelled(html, "Råstoff") ?? labelled(html, "Druer");
  out.producer  ??= labelled(html, "Produsent");

  out.smell ??= labelled(html, "Lukt");
  out.taste ??= labelled(html, "Smak");
  const note = [out.smell, out.taste].filter(Boolean).join(" ");
  if (note) out.tastingNote = note;

  // vintage: the year in the product name, not any old four digits on the page
  const year = out.name?.match(/\b(19|20)\d{2}\b/)?.[0];
  if (year) out.vintage ??= parseInt(year, 10);

  return out;
}

/**
 * The answer key, from Vinmonopolet’s own sensory ratings.
 *
 * Their body/acidity/tannin run 1-12 and the card runs 1-5, so they are
 * rescaled rather than guessed at. Where a measurement is missing we fall back
 * to inferring from the numbers on the label — sugar is sweetness, and alcohol
 * tracks body closely enough to be a starting point — but their sensory rating
 * always wins. The host edits whatever comes out.
 */
export function draftKey(w: PoletWine) {
  const key: Record<string, number | undefined> = {};
  const toFive = (v: number) => Math.min(5, Math.max(1, Math.round(1 + ((v - 1) * 4) / 11)));

  if (w.bodyRaw != null) key.keyBody = toFive(w.bodyRaw);
  if (w.acidRaw != null) key.keyAcidity = toFive(w.acidRaw);
  if (w.tanninRaw != null) key.keyTannin = toFive(w.tanninRaw);
  if (w.sweetRaw != null) key.keySweetness = toFive(w.sweetRaw);

  // sugar and acid off the label, for the fields they did not score
  if (key.keySweetness == null && w.sugarGl != null)
    key.keySweetness = w.sugarGl < 5 ? 1 : w.sugarGl < 15 ? 2 : w.sugarGl < 35 ? 3 : 4;
  if (key.keyAcidity == null && w.acidGl != null)
    key.keyAcidity = w.acidGl < 4.5 ? 2 : w.acidGl < 5.5 ? 3 : w.acidGl < 6.5 ? 4 : 5;

  if (w.alcohol != null)
    key.keyAlcohol = w.alcohol < 11 ? 1 : w.alcohol < 12.5 ? 2 : w.alcohol < 13.5 ? 3 : w.alcohol < 14.5 ? 4 : 5;
  if (key.keyBody == null && key.keyAlcohol != null) key.keyBody = key.keyAlcohol;

  return key;
}
