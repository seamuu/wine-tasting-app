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

/**
 * Where each bucket starts, in kroner. Only the lower bound is written down:
 * the printed label says "270-289" but the bucket really runs to 289.99, and
 * spelling both ends out left gaps at every boundary - a 289,90 bottle matched
 * no bucket at all and fell through to "350+", quietly scoring the price round
 * against the wrong answer.
 */
const BUCKET_FLOORS: number[] = [
  0, 150, 170, 190, 210, 230, 250, 270, 290, 310, 330, 350,
];

/** Which bucket a real price falls in — this is how the price round is scored. */
export function bucketForPrice(nok: number): number {
  for (let i = BUCKET_FLOORS.length - 1; i > 0; i--) if (nok >= BUCKET_FLOORS[i]) return i;
  return 0;
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
    label: "Vibes / Twink",
    a: ["Chaotic", "Smug", "Feral", "Serene", "Messy"],
    b: ["Twink", "Bear", "Dyke", "Mommy"],
  },
  plants: {
    label: "Plants",
    a: ["Cactus", "Fern", "Ivy", "Moss", "Thistle"],
    b: ["Root", "Leaf", "Bud", "Thorn"],
  },
};

/** The card prints one bubble per wine, so the flight can be up to eight long. */
export const POSITIONS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;
export type Position = (typeof POSITIONS)[number];

/** How many A4 sheets a pack needs: one card per guest per wine, two up, duplex. */
export function printMath(guests: number, wines: number) {
  const cards = guests * wines;
  return { cards, sheets: Math.ceil(cards / 2) };
}

/** A flavour is stored as "Category|Option", matching the card's own wording. */
export function splitFlavour(f: string): { category: string; option: string } {
  const i = f.indexOf("|");
  return i === -1
    ? { category: "", option: f }
    : { category: f.slice(0, i), option: f.slice(i + 1) };
}
