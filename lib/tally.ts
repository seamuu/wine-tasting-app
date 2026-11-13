/**
 * Turning submissions into the numbers the screens draw.
 *
 * Everything here is pure and takes plain rows, so the present deck, the run
 * screen and the results tab all read from one set of definitions rather than
 * each computing "the room's average" slightly differently.
 */

import { categoriesFor, type Category } from "./flavours";
import { scoreWine, type Answer, type Key, type Score } from "./scoring";
import { isUnnamedTaster, tasterLabel } from "./taster";
export { tasterLabel } from "./taster";

export type Sub = Answer & {
  id: string;
  tasterId: string;
  taster: { id: string; idA: string; idB: string; name: string | null };
  status: string;
};

export type WineRow = Key & {
  id: string;
  position: string;
  name: string;
  side: string;
  stage: string;
  teaser: string | null;
  submissions: Sub[];
};

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

// ---------------------------------------------------------------- the wheel

export type WheelSlice = {
  category: Category;
  /** Votes per option, in the category's printed order. */
  counts: number[];
  total: number;
  /** How many people marked anything at all in this category. */
  voters: number;
  /** Options the answer key says are actually there. */
  correct: boolean[];
};

/**
 * One slice per printed category, each holding its five options' vote counts.
 * The wheel bulges by `counts`, so a category nobody found still occupies its
 * share of the circle — the shape of the room's agreement is the point, and it
 * only reads if the categories stay in fixed positions.
 */
export function wheelData(subs: Sub[], side: string, key: string[] = []): WheelSlice[] {
  const cats = categoriesFor(side);
  const tally = new Map<string, number>();
  for (const s of subs) for (const f of s.flavours) tally.set(f, (tally.get(f) ?? 0) + 1);

  return cats.map((category) => {
    const counts = category.options.map((o) => tally.get(`${category.name}|${o}`) ?? 0);
    const correct = category.options.map((o) => key.includes(`${category.name}|${o}`));
    return {
      category,
      counts,
      correct,
      total: counts.reduce((a, b) => a + b, 0),
      voters: subs.filter((s) => s.flavours.some((f) => f.startsWith(`${category.name}|`))).length,
    };
  });
}

/** The flavours the room actually settled on, most-found first. */
export function consensus(subs: Sub[], limit = 8) {
  const tally = new Map<string, number>();
  for (const s of subs) for (const f of s.flavours) tally.set(f, (tally.get(f) ?? 0) + 1);
  return [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

// ------------------------------------------------------------- the numbers

export function ratingHistogram(subs: Sub[]): number[] {
  const bins = Array(10).fill(0);
  for (const s of subs) if (s.rating != null && s.rating >= 1 && s.rating <= 10) bins[s.rating - 1] += 1;
  return bins;
}

export const STRUCTURE = [
  { attr: "body", key: "keyBody", label: "Body", lo: "Light", hi: "Full" },
  { attr: "acidity", key: "keyAcidity", label: "Acidity", lo: "Soft", hi: "Zingy" },
  { attr: "tannin", key: "keyTannin", label: "Tannin", lo: "Smooth", hi: "Grippy" },
  { attr: "sweetness", key: "keySweetness", label: "Sweetness", lo: "Dry", hi: "Sweet" },
  { attr: "alcohol", key: "keyAlcohol", label: "Alcohol", lo: "Low", hi: "High" },
] as const;

export function structureSummary(wine: WineRow) {
  return STRUCTURE.map((row) => {
    const values = wine.submissions
      .map((s) => s[row.attr])
      .filter((n): n is number => n != null);
    return {
      ...row,
      values,
      average: mean(values),
      answer: wine[row.key] as number | null,
      counts: [1, 2, 3, 4, 5].map((n) => values.filter((v) => v === n).length),
    };
  });
}

// ------------------------------------------------------------- leaderboard

export type Standing = {
  taster: { id: string; idA: string; idB: string; name: string | null };
  label: string;
  perWine: Map<string, Score>;
  played: number;
  average: number;
  eligible: boolean;
};

/**
 * Ranked by average rather than total, so someone who arrived late is not
 * mathematically out of it. The other side of that: a single lucky card
 * shouldn't win the night either, so anyone below half the flight is ranked
 * separately rather than at the top.
 */
export function leaderboard(wines: WineRow[]): Standing[] {
  const scored = wines.filter((w) => w.submissions.length > 0);
  const byTaster = new Map<string, Standing>();

  for (const wine of scored) {
    const scores = scoreWine(wine.submissions, wine);
    for (const sub of wine.submissions) {
      if (isUnnamedTaster(sub.taster)) continue;
      const score = scores.get(sub);
      if (!score || score.total == null) continue;
      let row = byTaster.get(sub.tasterId);
      if (!row) {
        row = {
          taster: sub.taster, label: tasterLabel(sub.taster),
          perWine: new Map(), played: 0, average: 0, eligible: false,
        };
        byTaster.set(sub.tasterId, row);
      }
      row.perWine.set(wine.id, score);
      row.played += 1;
    }
  }

  const needed = Math.max(1, Math.ceil(scored.length / 2));
  const rows = [...byTaster.values()];
  for (const row of rows) {
    const totals = [...row.perWine.values()].map((s) => s.total ?? 0);
    row.average = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
    row.eligible = row.played >= needed;
  }

  return rows.sort((a, b) =>
    Number(b.eligible) - Number(a.eligible) || b.average - a.average || b.played - a.played);
}

// ------------------------------------------------------------ superlatives

export type Superlative = { title: string; who: string; detail: string };

/**
 * The awards nobody competes for. Each one needs a real reason to exist, so a
 * category is dropped rather than handed out on no evidence.
 */
export function superlatives(wines: WineRow[]): Superlative[] {
  const scored = wines.filter((w) => w.submissions.length > 0);
  if (scored.length === 0) return [];

  type Acc = {
    label: string; flavour: number[]; price: number[]; ratings: number[];
    roomGaps: number[]; marks: number[];
  };
  const acc = new Map<string, Acc>();
  const get = (s: Sub) => {
    let a = acc.get(s.tasterId);
    if (!a) { a = { label: tasterLabel(s.taster), flavour: [], price: [], ratings: [], roomGaps: [], marks: [] }; acc.set(s.tasterId, a); }
    return a;
  };

  for (const wine of scored) {
    const scores = scoreWine(wine.submissions, wine);
    const roomRating = mean(wine.submissions.map((s) => s.rating).filter((n): n is number => n != null));
    for (const sub of wine.submissions) {
      if (isUnnamedTaster(sub.taster)) continue;
      const a = get(sub);
      const sc = scores.get(sub);
      if (sc?.flavour != null) a.flavour.push(sc.flavour);
      if (sc?.price != null) a.price.push(sc.price);
      a.marks.push(sub.flavours.length);
      if (sub.rating != null) {
        a.ratings.push(sub.rating);
        if (roomRating != null) a.roomGaps.push(sub.rating - roomRating);
      }
    }
  }

  const rows = [...acc.values()];
  const out: Superlative[] = [];
  // One award each. Handing the same person two of them reads as a bug rather
  // than a compliment, so a winner steps aside for the runner-up.
  const spoken = new Set<string>();
  const best = (pick: (a: Acc) => number | null, min = 1) => {
    const ranked = rows
      .map((r) => ({ r, v: pick(r) }))
      .filter((x): x is { r: Acc; v: number } => x.v != null && Number.isFinite(x.v))
      .filter((x) => x.r.ratings.length + x.r.flavour.length >= min)
      .filter((x) => !spoken.has(x.r.label))
      .sort((a, b) => b.v - a.v);
    return ranked[0];
  };
  const award = (title: string, who: string, detail: string) => {
    spoken.add(who);
    out.push({ title, who, detail });
  };
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

  const nose = best((a) => avg(a.flavour));
  if (nose && nose.v > 0) award("Best nose", nose.r.label,
    `${Math.round(nose.v * 100)}% of the aromas, on average`);

  const wallet = best((a) => avg(a.price));
  if (wallet && wallet.v > 0) award("Knows what things cost", wallet.r.label,
    "closest on price across the flight");

  const generous = best((a) => avg(a.roomGaps));
  if (generous && generous.v > 0.4) award("Easily pleased", generous.r.label,
    `rated ${generous.v.toFixed(1)} above the room`);

  const harsh = best((a) => { const m = avg(a.roomGaps); return m == null ? null : -m; });
  if (harsh && harsh.v > 0.4) award("Hard to impress", harsh.r.label,
    `rated ${harsh.v.toFixed(1)} below the room`);

  const scatter = best((a) => avg(a.marks));
  if (scatter && scatter.v >= 12) award("Found everything", scatter.r.label,
    `${scatter.v.toFixed(0)} aromas a glass`);

  const spare = best((a) => { const m = avg(a.marks); return m == null ? null : -m; });
  if (spare && -spare.v <= 3) award("Economical", spare.r.label,
    `${(-spare.v).toFixed(0)} aromas a glass`);

  return out.slice(0, 4);
}
