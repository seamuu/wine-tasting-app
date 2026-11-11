import type { WheelSlice } from "@/lib/tally";

/**
 * The room's nose, as a wheel.
 *
 * Every flavour on the card gets a spoke, in the card's own order, so the
 * categories always sit in the same place. The room's votes pull each spoke
 * outward and a smooth curve is drawn through all ninety of them, so the shape
 * bulges where people reached for the same family and stays tucked in where
 * nobody did. Agreement is a shape you can read across a table.
 *
 * Colour is the flavour itself — citrus is lemon, red fruit is red, earth is
 * brown — which makes the ring a spectrum and a bulge recognisable before you
 * have read any of the labels. Diamonds on the rim are what was really in the
 * glass.
 */

const VIEW = 760;
const CX = VIEW / 2, CY = VIEW / 2;
const R_HUB = 96;    // the hole in the middle
const R_IN = 112;    // a spoke with no votes starts here
const R_OUT = 244;   // a spoke everyone marked reaches here
const R_RING = 262;  // the coloured spectrum band
const R_RING2 = 276;

/**
 * The bulge is a smoothed reading of the spokes, not the raw ones. Drawn raw,
 * ninety spokes give ninety needles; smoothing across each flavour's immediate
 * neighbours means votes that landed in the same family swell into one shape,
 * which is the thing worth looking at. The dots stay on the true values, so
 * nothing is hidden by the smoothing.
 */
const FALLOFF = [0.18, 0.42, 0.72, 1, 0.72, 0.42, 0.18];
/**
 * `family` marks which flavour family each spoke belongs to. Smoothing stops at
 * those boundaries: run across them, one vote on the last flavour of Citrus
 * fruit raised the first flavour of Orchard fruit to 72% of its height, drawn
 * in Orchard fruit's own colour - a bulge for something nobody marked. Within a
 * family the swell is the point; across one it is a false reading.
 */
function smooth(values: number[], family: number[]): number[] {
  const n = values.length, mid = (FALLOFF.length - 1) / 2;
  // Take the strongest neighbour rather than the average: averaging would drag
  // a flavour eight people found down towards the zeroes on either side of it,
  // and the height of a bulge is the whole point.
  return values.map((_, i) =>
    FALLOFF.reduce((best, f, k) => {
      const j = (i + k - mid + n) % n;
      if (family[j] !== family[i]) return best;
      return Math.max(best, f * values[j]);
    }, 0));
}

const pt = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)] as const;
};

function ringSector(r0: number, r1: number, a0: number, a1: number) {
  const [x0, y0] = pt(r1, a0), [x1, y1] = pt(r1, a1);
  const [x2, y2] = pt(r0, a1), [x3, y3] = pt(r0, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${x0} ${y0}A${r1} ${r1} 0 ${large} 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 ${large} 0 ${x3} ${y3}Z`;
}

/**
 * A closed Catmull-Rom spline through the spoke tips, as cubic Béziers. The
 * curve wraps, so the shape has no seam at twelve o'clock.
 */
function tangents(points: readonly (readonly [number, number])[]) {
  const n = points.length;
  return points.map((_, i) => {
    const [px, py] = points[(i - 1 + n) % n];
    const [nx, ny] = points[(i + 1) % n];
    return [(nx - px) / 6, (ny - py) / 6] as const;
  });
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
  const spokes = slices.flatMap((s, si) =>
    s.counts.map((count, oi) => ({
      count,
      slice: s,
      family: si,
      correct: s.correct[oi],
      option: s.category.options[oi],
      index: si * s.counts.length + oi,
    })));

  const n = spokes.length;
  const step = 360 / n;
  // Scale to the room: a flavour everyone marked reaches the rim, and one lone
  // voice looks like one voice rather than filling the wheel.
  const peak = Math.max(1, tasters, ...spokes.map((s) => s.count));
  const radius = (count: number) => R_IN + (count / peak) * (R_OUT - R_IN);

  const angleOf = (i: number) => i * step;
  const eased = smooth(spokes.map((s) => s.count), spokes.map((s) => s.family));
  const tips = eased.map((v, i) => pt(radius(v), angleOf(i)));
  const tan = tangents(tips);

  let blob = `M${tips[0][0]} ${tips[0][1]}`;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    blob += `C${tips[i][0] + tan[i][0]} ${tips[i][1] + tan[i][1]},` +
            `${tips[j][0] - tan[j][0]} ${tips[j][1] - tan[j][1]},` +
            `${tips[j][0]} ${tips[j][1]}`;
  }
  blob += "Z";

  /** The same curve, but only the arc belonging to one category, closed to the
   *  centre — so each bulge can be filled in its own flavour's colour. */
  const wedge = (from: number, count: number) => {
    let d = `M${CX} ${CY}L${tips[from][0]} ${tips[from][1]}`;
    for (let k = 0; k < count; k++) {
      const i = (from + k) % n, j = (from + k + 1) % n;
      d += `C${tips[i][0] + tan[i][0]} ${tips[i][1] + tan[i][1]},` +
           `${tips[j][0] - tan[j][0]} ${tips[j][1] - tan[j][1]},` +
           `${tips[j][0]} ${tips[j][1]}`;
    }
    return d + "Z";
  };

  const per = slices[0]?.counts.length ?? 5;
  const half = R_IN + 0.5 * (R_OUT - R_IN);
  // The results page draws one wheel per wine, so the clip path needs an id of
  // its own — duplicates would all resolve to whichever rendered first.
  const clip = `wheel-clip-${(headline ?? "x").replace(/[^A-Za-z0-9]/g, "") || "x"}`;

  return (
    <svg viewBox={`0 0 ${VIEW} ${VIEW}`} width="100%" height="100%"
         preserveAspectRatio="xMidYMid meet"
         style={{ maxHeight: size, display: "block", margin: "0 auto" }}
         role="img"
         aria-label={`Flavour wheel: ${slices.filter((s) => s.total > 0).map((s) => s.category.name).join(", ") || "nothing marked yet"}`}>
      <defs>
        <clipPath id={clip}>
          <circle cx={CX} cy={CY} r={R_OUT} />
        </clipPath>
      </defs>

      {/* the everyone/half-the-room rings the bulge is measured against */}
      <circle cx={CX} cy={CY} r={R_OUT} fill="none" stroke="#DED2C0" strokeWidth={1} />
      <circle cx={CX} cy={CY} r={half} fill="none" stroke="#DED2C0" strokeWidth={1} strokeDasharray="2 5" />

      {/* every spoke, faint, so the grid the shape sits on is visible */}
      {spokes.map((s, i) => {
        const [x, y] = pt(R_OUT, angleOf(i));
        const [ix, iy] = pt(R_IN, angleOf(i));
        return <line key={i} x1={ix} y1={iy} x2={x} y2={y} stroke="#E6DCCB" strokeWidth={0.6} />;
      })}

      {/* the bulge, one filled arc per flavour family */}
      <g clipPath={`url(#${clip})`}>
        {slices.map((slice, si) => (
          <path key={slice.category.name} d={wedge(si * per, per)}
                fill={slice.category.colour} opacity={slice.total > 0 ? 0.5 : 0.13} />
        ))}
      </g>
      <path d={blob} fill="none" stroke="#241A15" strokeWidth={1.1} opacity={0.5} />

      {/* each marked flavour on its own stem, at its true count — the honest
          reading underneath the smoothed shape */}
      {spokes.map((s, i) => {
        if (s.count === 0) return null;
        const r = radius(s.count);
        const [x, y] = pt(r, angleOf(i));
        const [ix, iy] = pt(R_IN, angleOf(i));
        return (
          <g key={i}>
            <line x1={ix} y1={iy} x2={x} y2={y} stroke={s.slice.category.colour} strokeWidth={0.9} opacity={0.85} />
            <circle cx={x} cy={y} r={2.6} fill={s.slice.category.colour} stroke="#FFFDF8" strokeWidth={0.8}>
              <title>{`${s.slice.category.name} · ${s.option} — ${s.count}`}</title>
            </circle>
          </g>
        );
      })}

      {/* the spectrum band, plus a diamond wherever the wine really does show it */}
      {slices.map((slice, si) => {
        const a0 = si * per * step, a1 = (si * per + per) * step;
        const mid = (a0 + a1) / 2;
        const flip = mid > 180;
        const [lx, ly] = pt(R_RING2 + 10, mid);
        return (
          <g key={slice.category.name}>
            <path d={ringSector(R_RING, R_RING2, a0 + 0.5, a1 - 0.5)}
                  fill={slice.category.colour} opacity={slice.total > 0 ? 1 : 0.35} />
            <text x={lx} y={ly} fontSize={12.5} fill="#241A15"
                  fontFamily="var(--font-body), system-ui, sans-serif"
                  opacity={slice.total > 0 ? 1 : 0.4}
                  textAnchor={flip ? "end" : "start"} dominantBaseline="middle"
                  transform={`rotate(${flip ? mid + 90 : mid - 90} ${lx} ${ly})`}>
              {slice.category.name}
            </text>
          </g>
        );
      })}
      {spokes.map((s, i) => {
        if (!s.correct) return null;
        const [x, y] = pt(R_RING - 8, angleOf(i));
        return (
          <rect key={`k${i}`} x={x - 3.4} y={y - 3.4} width={6.8} height={6.8}
                transform={`rotate(45 ${x} ${y})`} fill="#FFFDF8" stroke="#241A15" strokeWidth={1.2}>
            <title>{`In the wine: ${s.slice.category.name} · ${s.option}`}</title>
          </rect>
        );
      })}

      <circle cx={CX} cy={CY} r={R_HUB} fill="#FFFDF8" stroke="#DED2C0" />
      {headline && (
        <text x={CX} y={sub ? CY - 4 : CY + 8} textAnchor="middle" fontSize={42}
              fontFamily="var(--font-display), Georgia, serif" fill="#241A15">
          {headline}
        </text>
      )}
      {sub && (
        <text x={CX} y={CY + 26} textAnchor="middle" fontSize={13}
              fontFamily="var(--font-body), system-ui, sans-serif" fill="#6B5A4E">
          {sub}
        </text>
      )}

      {/* Hover targets: one wedge per flavour, covering the whole spoke rather
          than the 2.6px dot at the end of it. Each carries its own label, shown
          by CSS alone - the wheel is rendered on the server and a tooltip is
          not worth making the whole thing a client component for. */}
      <style>{`
        .wheel-hot .wheel-tip { opacity: 0; pointer-events: none; }
        .wheel-hot:hover .wheel-tip { opacity: 1; }
        .wheel-hot:hover .wheel-ray { opacity: .55; }
      `}</style>
      {spokes.map((s, i) => {
        const a0 = angleOf(i) - step / 2, a1 = angleOf(i) + step / 2;
        const text = `${s.slice.category.name} · ${s.option}`;
        const said = s.count === 0
          ? "nobody marked it"
          : `${s.count} ${s.count === 1 ? "person" : "people"}${tasters ? ` of ${tasters}` : ""}`;
        const w = Math.max(text.length, said.length) * 7.4 + 26;
        return (
          <g key={`hot${i}`} className="wheel-hot">
            <path d={ringSector(R_HUB, R_RING, a0, a1)} fill="transparent" />
            <path className="wheel-ray" d={ringSector(R_IN, R_OUT, a0 + 0.6, a1 - 0.6)}
                  fill={s.slice.category.colour} opacity={0} style={{ pointerEvents: "none" }} />
            <g className="wheel-tip">
              <rect x={CX - w / 2} y={CY + 44} width={w} height={44} rx={9}
                    fill="#FFFDF8" stroke="#DED2C0" />
              <text x={CX} y={CY + 62} textAnchor="middle" fontSize={15} fill="#241A15"
                    fontFamily="var(--font-body), system-ui, sans-serif" fontWeight={600}>
                {text}
              </text>
              <text x={CX} y={CY + 79} textAnchor="middle" fontSize={12.5} fill="#6B5A4E"
                    fontFamily="var(--font-body), system-ui, sans-serif">
                {said}{s.correct ? " · in the wine" : ""}
              </text>
            </g>
          </g>
        );
      })}

    </svg>
  );
}

export function WheelLegend({ hasKey }: { hasKey: boolean }) {
  return (
    <div className="row" style={{ gap: "1.1rem", justifyContent: "center" }}>
      <span className="small">Bulge = how hard the room reached for that family</span>
      {hasKey && (
        <span className="small" style={{ display: "inline-flex", alignItems: "center", gap: ".35rem" }}>
          <i style={{ width: 9, height: 9, background: "var(--paper-2)", border: "1.4px solid var(--ink)",
                      transform: "rotate(45deg)", display: "inline-block" }} />
          actually in the wine
        </span>
      )}
    </div>
  );
}
