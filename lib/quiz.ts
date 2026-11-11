/**
 * The team matching round.
 *
 * Each category is a permutation puzzle: four wines, four answers, one each.
 * Teams work out which goes with which, which is a thing five people can argue
 * about — unlike "is that cherry or raspberry", which is where the solo card
 * sends everyone quiet.
 *
 * The options are printed in a scrambled order so A is not wine 1. That order
 * is derived rather than stored: the same event and category always shuffle the
 * same way, so a reprinted sheet matches the one already on the table, and
 * there is no state to get out of step with the paper.
 */

export const CATEGORIES = ["PRICE", "ORIGIN", "NOTE", "GRAPE"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_META: Record<Category, { title: string; blurb: string; owner: string }> = {
  PRICE:  { title: "Price",   blurb: "which wine costs what",        owner: "The Wallet" },
  ORIGIN: { title: "Origin",  blurb: "where each one grew",          owner: "The Geographer" },
  NOTE:   { title: "The note", blurb: "match the writer to the glass", owner: "The Nose" },
  GRAPE:  { title: "Grapes",  blurb: "what each one is made of",     owner: "The Palate" },
};

export type QuizWine = {
  id: string;
  position: string;
  name: string;
  priceNok: unknown;
  appellation: string | null;
  region: string | null;
  country: string | null;
  grapes: string | null;
  tastingNote: string | null;
};

const dec = (v: unknown) => (v == null ? null : Number(String(v)));

const trim = (s: string, n: number) =>
  s.length <= n ? s : s.slice(0, s.lastIndexOf(" ", n - 1) > n - 25 ? s.lastIndexOf(" ", n - 1) : n - 1).trimEnd() + "…";

/** What this wine's answer looks like in that category, or null if we don't know it. */
export function optionFor(wine: QuizWine, category: Category): string | null {
  switch (category) {
    case "PRICE": {
      const p = dec(wine.priceNok);
      return p == null ? null : `kr ${Math.round(p)}`;
    }
    case "ORIGIN":
      return wine.appellation ?? wine.region ?? wine.country ?? null;
    case "NOTE":
      return wine.tastingNote ? trim(wine.tastingNote, 150) : null;
    case "GRAPE":
      return wine.grapes ? trim(wine.grapes, 70) : null;
  }
}

/**
 * A category is only worth printing when every wine has an answer AND no two
 * share one. Duplicates quietly destroy the round: three wines all answering
 * "Italia" cannot be told apart, so the puzzle has no solution and marking it
 * right or wrong is meaningless. Better to drop the category and say why.
 */
export function playable(wines: QuizWine[], category: Category): boolean {
  if (wines.length < 2) return false;
  const opts = wines.map((w) => optionFor(w, category));
  if (opts.some((o) => o == null)) return false;
  return new Set(opts.map((o) => o!.toLowerCase())).size === opts.length;
}

/** Why a category did not make the sheet, in words the host can act on. */
export function whyNotPlayable(wines: QuizWine[], category: Category): string | null {
  if (playable(wines, category)) return null;
  const opts = wines.map((w) => optionFor(w, category));
  const missing = wines.filter((_, i) => opts[i] == null).map((w) => w.position);
  if (missing.length) return `no value for wine ${missing.join(", ")}`;
  const seen = new Map<string, string[]>();
  wines.forEach((w, i) => {
    const k = opts[i]!.toLowerCase();
    seen.set(k, [...(seen.get(k) ?? []), w.position]);
  });
  const clash = [...seen.entries()].filter(([, ws]) => ws.length > 1);
  if (clash.length) return `wines ${clash.map(([, ws]) => ws.join(" & ")).join(", ")} share an answer`;
  return "not enough wines";
}

/** Deterministic, so a reprint matches the sheet already on the table. */
function seeded(key: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}

/** The wines in the order their answers are printed — so slot 0 is option A. */
export function optionOrder(eventId: string, category: Category, wines: QuizWine[]): QuizWine[] {
  const out = [...wines].sort((a, b) => a.position.localeCompare(b.position));
  const rand = seeded(`${eventId}:${category}`);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  // A permutation that leaves an answer against its own wine makes the round
  // look rigged, so nudge any fixed point along.
  const sorted = [...wines].sort((a, b) => a.position.localeCompare(b.position));
  for (let i = 0; i < out.length; i++) {
    if (out[i].id === sorted[i].id) {
      const j = (i + 1) % out.length;
      [out[i], out[j]] = [out[j], out[i]];
    }
  }
  return out;
}

/* Options are numbered, not lettered. The glasses are already A-D on the
   tasting card, and "wine A is price A" is a sentence nobody can hold. */
export const OPTION_LABELS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

/** Guesses are stored as the wine whose answer was chosen, so scoring is equality. */
export function scoreCategory(guesses: Map<string, string | null>, wines: QuizWine[]) {
  let right = 0;
  for (const w of wines) if (guesses.get(w.id) === w.id) right += 1;
  return { right, of: wines.length };
}
