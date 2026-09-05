/**
 * How closely each person matched the wine.
 *
 * Three rounds, weighted by how hard they are and how much of the game they
 * are: price 25, structure 35, aroma 40.
 *
 * Two decisions worth knowing about:
 *
 * 1. A component only counts if the host set an answer for it. A wine with no
 *    flavour key is scored on price and structure alone, rescaled to 100, so
 *    someone is never punished for a key the host didn't fill in.
 *
 * 2. If a wine has no key at all, the room becomes the key — you are scored on
 *    how close you were to what everyone else said. That keeps "the orange one
 *    Kristian brought" in the game.
 *
 * The aroma round uses a Dice coefficient rather than a hit count, which is
 * what stops the obvious exploit: marking every box puts your own total in the
 * denominator, so a scattergun answer scores badly on purpose. Getting the
 * right family but the wrong word — raspberry when the answer was cherry —
 * takes half credit, because at a tasting that is genuinely most of the way
 * there.
 */

import { splitFlavour } from "./card";

export const WEIGHTS = { price: 25, structure: 35, flavour: 40 } as const;

export type Key = {
  priceBucket: number | null;
  keyBody: number | null;
  keyAcidity: number | null;
  keyTannin: number | null;
  keySweetness: number | null;
  keyAlcohol: number | null;
  keyFlavours: string[];
};

export type Answer = {
  priceBucket: number | null;
  body: number | null;
  acidity: number | null;
  tannin: number | null;
  sweetness: number | null;
  alcohol: number | null;
  rating: number | null;
  flavours: string[];
};

export type Score = {
  /** 0–100, rescaled over whichever rounds could be scored. */
  total: number | null;
  price: number | null;      // 0–1 within its round
  structure: number | null;
  flavour: number | null;
  /** True when the room stood in for a missing answer key. */
  againstRoom: boolean;
};

const ATTRS = ["body", "acidity", "tannin", "sweetness", "alcohol"] as const;
const KEY_ATTRS = ["keyBody", "keyAcidity", "keyTannin", "keySweetness", "keyAlcohol"] as const;

/** One step out on a 1–5 scale is a good answer; two is a poor one; three is a miss. */
const CLOSENESS = [1, 0.55, 0.2, 0, 0];

/** Price is a 12-bucket guess, so the neighbouring bucket earns half. */
function scorePrice(guess: number | null, answer: number | null): number | null {
  if (guess == null || answer == null) return null;
  const d = Math.abs(guess - answer);
  return d === 0 ? 1 : d === 1 ? 0.5 : d === 2 ? 0.15 : 0;
}

function scoreStructure(a: Answer, k: Key): number | null {
  let got = 0, of = 0;
  ATTRS.forEach((attr, i) => {
    const answer = k[KEY_ATTRS[i]];
    if (answer == null) return;          // host left it blank: not part of the score
    of += 1;
    const guess = a[attr];
    if (guess != null) got += CLOSENESS[Math.min(4, Math.abs(guess - answer))];
  });
  return of === 0 ? null : got / of;
}

/**
 * Dice overlap between what you found and what was there, with half credit for
 * landing in the right category. Greedy is fine here: each key entry is spent
 * at most once, and exact matches are taken first so a family match can never
 * consume a word that would have matched outright.
 */
export function scoreFlavour(found: string[], key: string[]): number | null {
  if (key.length === 0) return null;
  if (found.length === 0) return 0;

  const remaining = new Set(key);
  let credit = 0;

  for (const f of found) {
    if (remaining.has(f)) { remaining.delete(f); credit += 1; }
  }
  const usedCats = new Set<string>();
  for (const f of found) {
    if (key.includes(f)) continue;               // already counted exactly
    const cat = splitFlavour(f).category;
    if (usedCats.has(cat)) continue;             // one family bonus per category
    const hit = [...remaining].find((k) => splitFlavour(k).category === cat);
    if (hit) { remaining.delete(hit); usedCats.add(cat); credit += 0.5; }
  }

  return (2 * credit) / (key.length + found.length);
}

/** What the room said, used as a stand-in key when the host set none. */
export function roomKey(answers: Answer[]): Key {
  const modal = (xs: number[]) => {
    if (!xs.length) return null;
    const tally = new Map<number, number>();
    for (const x of xs) tally.set(x, (tally.get(x) ?? 0) + 1);
    return [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
  };
  const median = (xs: number[]) => {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b);
    return Math.round(s[(s.length - 1) >> 1]);
  };
  const pick = <T,>(f: (a: Answer) => T | null) =>
    answers.map(f).filter((v): v is T => v != null);

  // a flavour is "what the room found" once at least a third of them marked it
  const tally = new Map<string, number>();
  for (const a of answers) for (const f of a.flavours) tally.set(f, (tally.get(f) ?? 0) + 1);
  const threshold = Math.max(2, Math.ceil(answers.length / 3));

  return {
    priceBucket: modal(pick((a) => a.priceBucket)),
    keyBody: median(pick((a) => a.body)),
    keyAcidity: median(pick((a) => a.acidity)),
    keyTannin: median(pick((a) => a.tannin)),
    keySweetness: median(pick((a) => a.sweetness)),
    keyAlcohol: median(pick((a) => a.alcohol)),
    keyFlavours: [...tally.entries()].filter(([, n]) => n >= threshold).map(([f]) => f),
  };
}

export function hasKey(k: Key): boolean {
  return k.priceBucket != null || k.keyFlavours.length > 0 ||
    KEY_ATTRS.some((a) => k[a] != null);
}

export function scoreOne(answer: Answer, key: Key, againstRoom = false): Score {
  const price = scorePrice(answer.priceBucket, key.priceBucket);
  const structure = scoreStructure(answer, key);
  const flavour = scoreFlavour(answer.flavours, key.keyFlavours);

  // rescale over whichever rounds were actually answerable
  let got = 0, of = 0;
  if (price != null) { got += price * WEIGHTS.price; of += WEIGHTS.price; }
  if (structure != null) { got += structure * WEIGHTS.structure; of += WEIGHTS.structure; }
  if (flavour != null) { got += flavour * WEIGHTS.flavour; of += WEIGHTS.flavour; }

  return {
    total: of === 0 ? null : Math.round((got / of) * 100),
    price, structure, flavour, againstRoom,
  };
}

/** Score every submission on one wine, falling back to the room where needed. */
export function scoreWine<T extends Answer>(subs: T[], key: Key): Map<T, Score> {
  const useRoom = !hasKey(key);
  const effective = useRoom ? roomKey(subs) : key;
  const out = new Map<T, Score>();
  for (const s of subs) out.set(s, scoreOne(s, effective, useRoom));
  return out;
}
