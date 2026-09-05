import type { WheelSlice } from "@/lib/tally";
import type { Tier } from "@/lib/flavours";

/**
 * The room's nose, as a wheel.
 *
 * Every printed category keeps its own fixed 20° of the circle whether anyone
 * found it or not — that is what makes the shape mean something. A wedge grows
 * outward with the number of people who marked it, so the wheel bulges where
 * the room agreed and stays flat where it didn't, and you can read the
 * agreement across the table without reading a single word.
 *
 * Colour is the tier: where the aroma comes from — the grape, the winemaking,
 * or the years since. Outlined wedges are the ones actually in the wine.
 */

const TIER_COLOUR: Record<Tier, string> = {
  Primary: "#6E1327",   // claret
  Secondary: "#A8843C", // gold
  Tertiary: "#5E6E42",  // olive
};

const CX = 340, CY = 340;
const R_HUB = 86;    // the hole in the middle, where the headline sits
const R_RING = 104;  // category band
const R_MAX = 246;   // a unanimous mark reaches here

const pt = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)] as const;
};

function sector(r0: number, r1: number, a0: number, a1: number) {
  const [x0, y0] = pt(r1, a0), [x1, y1] = pt(r1, a1);
  const [x2, y2] = pt(r0, a1), [x3, y3] = pt(r0, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${x0} ${y0}A${r1} ${r1} 0 ${large} 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 ${large} 0 ${x3} ${y3}Z`;
}

export default function Wheel({
  slices, tasters, headline, sub, size,
}: {
  slices: WheelSlice[];
  tasters: number;
  headline?: string;
  sub?: string;
  /** Cap the drawing. Left off, it fills whatever box it's put in. */
  size?: number;
}) {
  const step = 360 / slices.length;
  const gap = 1.4;
  // Scale to the room, not to the best-supported wedge: a wedge everybody
  // marked should reach the rim, and one lone voice should look like one.
  const peak = Math.max(1, tasters, ...slices.flatMap((s) => s.counts));

  return (
    <svg viewBox="0 0 680 680" width="100%" height="100%"
         preserveAspectRatio="xMidYMid meet"
         style={{ maxHeight: size, display: "block", margin: "0 auto" }}
         role="img"
         aria-label={`Flavour wheel: ${slices.filter((s) => s.total > 0).map((s) => s.category.name).join(", ") || "nothing marked yet"}`}>
      {/* the faint track a wedge grows along, so an empty wheel still reads as one */}
      <circle cx={CX} cy={CY} r={R_MAX} fill="none" stroke="#DED2C0" strokeWidth={1} />
      <circle cx={CX} cy={CY} r={(R_RING + R_MAX) / 2} fill="none" stroke="#DED2C0" strokeWidth={1} strokeDasharray="2 5" />

      {slices.map((slice, i) => {
        const a0 = i * step + gap / 2;
        const a1 = (i + 1) * step - gap / 2;
        const colour = TIER_COLOUR[slice.category.tier];
        const optWidth = (a1 - a0) / slice.counts.length;
        const mid = (a0 + a1) / 2;
        const flip = mid > 180;
        const [lx, ly] = pt(R_MAX + 12, mid);

        return (
          <g key={slice.category.name}>
            {/* category band — solid where this category got any votes at all */}
            <path d={sector(R_HUB + 4, R_RING, a0, a1)} fill={colour}
                  opacity={slice.total > 0 ? 0.9 : 0.16} />

            {slice.counts.map((count, j) => {
              const b0 = a0 + j * optWidth + 0.25;
              const b1 = a0 + (j + 1) * optWidth - 0.25;
              const grown = R_RING + 4 + (count / peak) * (R_MAX - R_RING - 4);
              const isKey = slice.correct[j];
              return (
                <g key={slice.category.options[j]}>
                  {/* the unfilled remainder, so you can see what wasn't found */}
                  <path d={sector(R_RING + 4, R_MAX, b0, b1)} fill={colour} opacity={0.05} />
                  {count > 0 && (
                    <path d={sector(R_RING + 4, grown, b0, b1)} fill={colour}
                          opacity={0.35 + 0.65 * (count / peak)} />
                  )}
                  {isKey && (
                    <path d={sector(R_RING + 4, R_MAX, b0, b1)} fill="none"
                          stroke="#A8843C" strokeWidth={1.6} strokeDasharray="3 3" />
                  )}
                </g>
              );
            })}

            <text x={lx} y={ly} fontSize={12.5} fill="#241A15"
                  fontFamily="var(--font-body), system-ui, sans-serif"
                  opacity={slice.total > 0 ? 1 : 0.4}
                  textAnchor={flip ? "end" : "start"}
                  dominantBaseline="middle"
                  transform={`rotate(${flip ? mid + 90 : mid - 90} ${lx} ${ly})`}>
              {slice.category.name}
            </text>
          </g>
        );
      })}

      <circle cx={CX} cy={CY} r={R_HUB} fill="#FFFDF8" stroke="#DED2C0" />
      {headline && (
        <text x={CX} y={sub ? CY - 6 : CY + 6} textAnchor="middle" fontSize={38}
              fontFamily="var(--font-display), Georgia, serif" fill="#241A15">
          {headline}
        </text>
      )}
      {sub && (
        <text x={CX} y={CY + 24} textAnchor="middle" fontSize={13}
              fontFamily="var(--font-body), system-ui, sans-serif" fill="#6B5A4E">
          {sub}
        </text>
      )}
    </svg>
  );
}

export function WheelLegend({ hasKey }: { hasKey: boolean }) {
  return (
    <div className="row" style={{ gap: ".9rem", justifyContent: "center" }}>
      {(["Primary", "Secondary", "Tertiary"] as Tier[]).map((t) => (
        <span key={t} className="small" style={{ display: "inline-flex", alignItems: "center", gap: ".35rem" }}>
          <i style={{ width: 10, height: 10, borderRadius: 2, background: TIER_COLOUR[t] }} />
          {t === "Primary" ? "the grape" : t === "Secondary" ? "the winemaking" : "the aging"}
        </span>
      ))}
      {hasKey && (
        <span className="small" style={{ display: "inline-flex", alignItems: "center", gap: ".35rem" }}>
          <i style={{ width: 10, height: 10, borderRadius: 2, border: "1.5px dashed #A8843C" }} />
          actually in the wine
        </span>
      )}
    </div>
  );
}
