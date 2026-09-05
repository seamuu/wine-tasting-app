import { PRICE_BUCKETS } from "@/lib/card";
import { structureSummary, type WineRow } from "@/lib/tally";

/**
 * The small charts. All of them size from their container rather than fixed
 * pixels, because the present deck packs them into a grid that must never
 * scroll — the cell decides how big the chart is, not the chart.
 */

export function Histogram({ bins, average }: { bins: number[]; average: number | null }) {
  const peak = Math.max(1, ...bins);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(10,1fr)", gap: 3, alignItems: "end", flex: 1, minHeight: 0 }}>
        {bins.map((n, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
            {n > 0 && (
              <span className="small tabular" style={{ textAlign: "center", fontSize: ".65rem", lineHeight: 1.2 }}>{n}</span>
            )}
            <span style={{
              display: "block",
              height: `${Math.max(n > 0 ? 6 : 2, (n / peak) * 100)}%`,
              background: n > 0 ? "var(--claret)" : "var(--rule)",
              borderRadius: "3px 3px 0 0",
            }} />
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(10,1fr)", gap: 3, marginTop: 3 }}>
        {bins.map((_, i) => (
          <span key={i} className="small tabular" style={{ textAlign: "center", fontSize: ".62rem" }}>{i + 1}</span>
        ))}
      </div>
      {average != null && (
        <p className="small" style={{ marginTop: ".35rem", textAlign: "center" }}>
          room average <b style={{ color: "var(--ink)" }}>{average.toFixed(1)}</b>
        </p>
      )}
    </div>
  );
}

/**
 * A 1–5 strip per attribute: a dot per person, stacked where they agreed, with
 * the answer marked. Shows the spread, which a bar of the mean hides — five
 * people split 1/5 and five people all saying 3 have the same average and
 * nothing else in common.
 */
export function StructureStrips({ wine, compact = false }: { wine: WineRow; compact?: boolean }) {
  const rows = structureSummary(wine);
  const peak = Math.max(1, ...rows.flatMap((r) => r.counts));

  return (
    <div className="stack" style={{ gap: compact ? ".3rem" : ".55rem" }}>
      {rows.map((row) => (
        <div key={row.attr} style={{ display: "grid", gridTemplateColumns: "4.6rem 1fr auto", gap: ".55rem", alignItems: "center" }}>
          <span className="small" style={{ color: "var(--ink)", fontSize: ".74rem" }}>{row.label}</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 3 }}>
            {row.counts.map((n, i) => {
              const isAnswer = row.answer === i + 1;
              return (
                <span key={i} title={`${n} said ${i + 1}`} style={{
                  display: "block", height: compact ? 14 : 18, borderRadius: 3,
                  background: n === 0 ? "var(--paper-3)" : "var(--claret)",
                  opacity: n === 0 ? 1 : 0.3 + 0.7 * (n / peak),
                  outline: isAnswer ? "2px solid var(--gold)" : undefined,
                  outlineOffset: 1,
                }} />
              );
            })}
          </div>
          <span className="small tabular" style={{ fontSize: ".7rem", minWidth: "2.6rem", textAlign: "right" }}>
            {row.average == null ? "—" : row.average.toFixed(1)}
            {row.answer != null && <span style={{ color: "var(--gold)" }}> /{row.answer}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Where the room thought the price sat, against where it actually sat. */
export function PriceSpread({ guesses, answer }: { guesses: number[]; answer: number | null }) {
  const counts = PRICE_BUCKETS.map((_, i) => guesses.filter((g) => g === i).length);
  const peak = Math.max(1, ...counts);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${PRICE_BUCKETS.length},1fr)`, gap: 2, alignItems: "end", height: 54 }}>
        {counts.map((n, i) => (
          <span key={i} title={`${PRICE_BUCKETS[i]} kr — ${n}`} style={{
            display: "block",
            height: `${Math.max(n > 0 ? 10 : 3, (n / peak) * 100)}%`,
            background: i === answer ? "var(--gold)" : n > 0 ? "var(--claret)" : "var(--rule)",
            borderRadius: "2px 2px 0 0",
          }} />
        ))}
      </div>
      {/* the end labels drop out when the answer already sits on that end,
          rather than printing the same bucket twice */}
      <div className="spread" style={{ marginTop: ".3rem" }}>
        <span className="small" style={{ fontSize: ".65rem", visibility: answer === 0 ? "hidden" : undefined }}>
          {PRICE_BUCKETS[0]}
        </span>
        {answer != null && (
          <span className="small" style={{ fontSize: ".68rem", color: "var(--gold)", fontWeight: 600 }}>
            {PRICE_BUCKETS[answer]} kr
          </span>
        )}
        <span className="small" style={{ fontSize: ".65rem", visibility: answer === PRICE_BUCKETS.length - 1 ? "hidden" : undefined }}>
          {PRICE_BUCKETS[PRICE_BUCKETS.length - 1]}
        </span>
      </div>
    </div>
  );
}
