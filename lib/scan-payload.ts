/** Convert a confirmed scanner reading to a validated submission payload. */
import { POSITIONS, type Position } from "@/lib/card";
import type { ScanPayload } from "@/app/actions";

export type WineRow = { position: string; name: string; side: string; count: number };

/** Shape scan-v2.html posts up after it reads a card. */
type ScanGroup = { name: string; kind: "one" | "many"; value: string | string[] | null; flag: string | null };
export type ScanResult = {
  scanId?: string;
  side: "white" | "red" | null;
  groups: ScanGroup[];
  error?: string;
  badMarks?: string[];
};

const num = (v: string | string[] | null) => {
  if (typeof v !== "string") return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

/**
 * Which wine a card belongs to.
 *
 * A card only carries as many letters as the flight was set up for when it was
 * printed, so a stack run off for four wines says A-D even on a night with six.
 * The colour is on the card as well, and the two colours are separate stacks of
 * paper, so a red card's "A" means the first RED wine. Take the letter at face
 * value when it names a wine of the same colour, and count within the colour
 * when it does not - which leaves a fully-lettered card reading exactly as
 * before, and rescues a short-lettered one.
 */
export function resolveWine(letter: Position, side: "white" | "red" | null, wines: WineRow[]): Position | null {
  const want = side === "red" ? "RED" : side === "white" ? "WHITE" : null;
  const direct = wines.find((w) => w.position === letter);
  if (direct && (!want || direct.side === want)) return direct.position as Position;
  // Colour unknown: the letter is all there is to go on.
  if (!want) return direct ? (direct.position as Position) : null;
  const ofColour = wines
    .filter((w) => w.side === want)
    .sort((a, b) => a.position.localeCompare(b.position));
  const nth = ofColour[POSITIONS.indexOf(letter)];
  return nth ? (nth.position as Position) : null;
}

/**
 * Turn the scanner's own vocabulary into a submission. The scanner reads its
 * labels off the printed card, so nothing here hardcodes flavour names — we
 * only need to know which groups are which kind of question.
 */
export function toPayload(eventId: string, r: ScanResult, buckets: string[], wines: WineRow[]): ScanPayload | { error: string } {
  if (r.error) return { error: "The card wasn't lined up — nothing was read." };

  const one = (name: string) => r.groups.find((g) => g.kind === "one" && g.name.toLowerCase() === name);
  const you = r.groups.filter((g) => g.name.toLowerCase() === "you are");

  const winePos = one("wine")?.value;
  if (typeof winePos !== "string" || !POSITIONS.includes(winePos as Position))
    return { error: "No wine letter was marked, so this card can't be filed." };
  const resolved = resolveWine(winePos as Position, r.side, wines);
  if (!resolved)
    return { error: `Nothing in this tasting matches ${r.side ?? ""} ${winePos}`.replace(/\s+/g, " ") };
  const hasName = you.length >= 2 && you.slice(0, 2).every(g => typeof g.value === "string" && g.value.trim() && !g.flag);

  const priceLabel = one("price")?.value;
  const priceBucket = typeof priceLabel === "string"
    ? buckets.findIndex((b) => b === priceLabel)
    : -1;

  const flavours: string[] = [];
  for (const g of r.groups) {
    if (g.kind === "many" && Array.isArray(g.value)) {
      for (const opt of g.value) flavours.push(`${g.name}|${opt}`);
    }
  }

  const flags = r.groups.filter((g) => g.flag && g.name.toLowerCase() !== "you are").map((g) => `${g.name}: ${g.flag}`);

  return {
    eventId,
    winePosition: resolved,
    idA: hasName ? you[0].value as string : null,
    idB: hasName ? you[1].value as string : null,
    scanId: r.scanId,
    side: r.side === "red" ? "RED" : "WHITE",
    priceBucket: priceBucket >= 0 ? priceBucket : null,
    body: num(one("body")?.value ?? null),
    acidity: num(one("acidity")?.value ?? null),
    tannin: num(one("tannin")?.value ?? null),
    sweetness: num(one("sweetness")?.value ?? null),
    alcohol: num(one("alcohol")?.value ?? null),
    rating: num(one("rating")?.value ?? null),
    flavours,
    needsReview: flags.length > 0 || r.side === null,
    reviewNote: flags.join(" · ") || (r.side === null ? "side code unreadable" : undefined),
  };
}

