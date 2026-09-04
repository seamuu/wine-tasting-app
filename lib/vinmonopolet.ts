/**
 * Pull a wine's facts from a Vinmonopolet product page.
 *
 * Worth doing rather than reading a label photo: the Polet publishes the price,
 * which is the answer to the price round, plus measured sugar and acid, which
 * turn two of the answer-key's structure scores from a judgement into a fact.
 *
 * The page is server-rendered with a JSON-LD block and a specification table.
 * We prefer JSON-LD where it exists and fall back to scraping labelled rows,
 * because a missing field should leave a blank for the host to fill rather than
 * a guess.
 */

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
};

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

  const out: PoletWine = { sourceUrl: url };

  out.sourceRef = url.match(/\/p\/(\d+)/)?.[1];

  // --- JSON-LD, when present, is the most reliable ---
  for (const block of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(block[1]);
      const node = Array.isArray(data) ? data.find((d) => d.name) : data;
      if (!node) continue;
      if (typeof node.name === "string") out.name = clean(node.name);
      if (node.brand?.name) out.producer = clean(node.brand.name);
      const price = node.offers?.price ?? node.offers?.[0]?.price;
      if (price != null) out.priceNok = num(String(price));
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

  const smell = labelled(html, "Lukt");
  const taste = labelled(html, "Smak");
  const note = [smell, taste].filter(Boolean).join(" ");
  if (note) out.tastingNote = note;

  // vintage: the year in the product name, not any old four digits on the page
  const year = out.name?.match(/\b(19|20)\d{2}\b/)?.[0];
  if (year) out.vintage = parseInt(year, 10);

  return out;
}

/** A rough answer key from what the listing measured. The host edits it. */
export function draftKey(w: PoletWine) {
  const key: Record<string, number | undefined> = {};
  // sugar and acid are measured, so these two are facts rather than opinions
  if (w.sugarGl != null) key.keySweetness = w.sugarGl < 5 ? 1 : w.sugarGl < 15 ? 2 : w.sugarGl < 35 ? 3 : 4;
  if (w.acidGl != null) key.keyAcidity = w.acidGl < 4.5 ? 2 : w.acidGl < 5.5 ? 3 : w.acidGl < 6.5 ? 4 : 5;
  if (w.alcohol != null) key.keyAlcohol = w.alcohol < 11 ? 1 : w.alcohol < 12.5 ? 2 : w.alcohol < 13.5 ? 3 : w.alcohol < 14.5 ? 4 : 5;
  // body tracks alcohol closely enough to be a useful starting point
  if (key.keyAlcohol != null) key.keyBody = Math.min(5, Math.max(1, key.keyAlcohol));
  return key;
}
