/**
 * The handful of card facts the server needs to know about.
 *
 * The scanner does NOT read from here — it measures the real card's DOM, so the
 * bubble map can never drift. But the app still has to render a price bucket
 * picker and name a taster, so these two lists are duplicated. Keep them in step
 * with public/card-v2.html; everything else about the card stays in the card.
 */

/** Printed on the card's PRICE row, in NOK. Index is what a submission stores. */
export const PRICE_BUCKETS = [
  "<150", "150–169", "170–189", "190–209", "210–229", "230–249",
  "250–269", "270–289", "290–309", "310–329", "330–349", "350+",
] as const;

/** Lower/upper bound of each bucket in kroner; the last one is open-ended. */
const BUCKET_BOUNDS: [number, number][] = [
  [0, 149], [150, 169], [170, 189], [190, 209], [210, 229], [230, 249],
  [250, 269], [270, 289], [290, 309], [310, 329], [330, 349], [350, Infinity],
];

/** Which bucket a real price falls in — this is how the price round is scored. */
export function bucketForPrice(nok: number): number {
  const i = BUCKET_BOUNDS.findIndex(([lo, hi]) => nok >= lo && nok <= hi);
  return i === -1 ? PRICE_BUCKETS.length - 1 : i;
}

/** The taster vocabularies the card can be printed with. 5 × 4 = 20 people. */
export const ID_SETS: Record<string, { label: string; a: string[]; b: string[] }> = {
  house: {
    label: "Skinny / Twink",
    a: ["Skinny", "Hot", "Ugly", "Annoying", "Hairy"],
    b: ["Twink", "Bear", "Dyke", "Mommy"],
  },
  colours: {
    label: "Colours + animals",
    a: ["Red", "Orange", "Yellow", "Green", "Blue"],
    b: ["Fox", "Owl", "Bear", "Wolf"],
  },
  vibes: {
    label: "Vibes",
    a: ["Chaotic", "Smug", "Feral", "Serene", "Messy"],
    b: ["Icon", "Legend", "Menace", "Angel"],
  },
  plants: {
    label: "Plants",
    a: ["Cactus", "Fern", "Ivy", "Moss", "Thistle"],
    b: ["Root", "Leaf", "Bud", "Thorn"],
  },
};

export const POSITIONS = ["A", "B", "C", "D"] as const;
export type Position = (typeof POSITIONS)[number];

/** A flavour is stored as "Category|Option", matching the card's own wording. */
export function splitFlavour(f: string): { category: string; option: string } {
  const i = f.indexOf("|");
  return i === -1
    ? { category: "", option: f }
    : { category: f.slice(0, i), option: f.slice(i + 1) };
}
