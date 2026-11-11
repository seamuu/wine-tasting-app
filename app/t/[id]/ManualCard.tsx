"use client";

import { useState } from "react";
import { saveManualCard } from "../../actions";
import { PRICE_BUCKETS } from "@/lib/card";
import { categoriesFor, TIERS, TIER_BLURB } from "@/lib/flavours";
import { STRUCTURE } from "@/lib/tally";

type WineRow = { position: string; name: string; side: string };

function Chip({ name, value, label, defaultChecked }: {
  name: string; value: string; label: string; defaultChecked?: boolean;
}) {
  return (
    <label className="chip chip-wide">
      <input type="radio" name={name} value={value} defaultChecked={defaultChecked} />
      <span>{label}</span>
    </label>
  );
}

/**
 * The paper card, on screen. Deliberately laid out in the same order as the
 * printed one — you are typing while looking at the card, so anything that
 * makes you hunt for the next question costs more than the space it saves.
 */
/** An existing card being corrected, rather than a new one being typed in. */
export type CardValues = {
  id: string; position: string; idA: string; idB: string;
  priceBucket: number | null; body: number | null; acidity: number | null;
  tannin: number | null; sweetness: number | null; alcohol: number | null;
  rating: number | null; flavours: string[];
};

export default function ManualCard({ eventId, idSet, wines, fixing }: {
  eventId: string;
  idSet: { label: string; a: string[]; b: string[] };
  wines: WineRow[];
  fixing?: CardValues | null;
}) {
  const [position, setPosition] = useState(fixing?.position ?? wines[0]?.position ?? "A");
  const wine = wines.find((w) => w.position === position);
  const side = wine?.side ?? "WHITE";
  const cats = categoriesFor(side);

  if (wines.length === 0) return null;

  return (
    <details className="card" style={{ marginTop: "1.2rem" }} open={!!fixing} id="manual-card">
      <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: ".9rem" }}>
        {fixing ? `Fixing ${fixing.idA} ${fixing.idB} — wine ${fixing.position}` : "Type a card in by hand"}
      </summary>
      <p className="small" style={{ margin: ".6rem 0 1.2rem" }}>
        {fixing
          ? "Everything the scan read is filled in below. Change what is wrong and save — it replaces the card rather than adding another."
          : "For a card the camera won\u2019t read. It files exactly like a scan, so if you get the photo working later it just replaces this."}
      </p>

      <form action={saveManualCard} className="stack" style={{ gap: "1.4rem" }}>
        <input type="hidden" name="eventId" value={eventId} />

        <div className="stack" style={{ gap: ".7rem" }}>
          <div>
            <span className="label">Wine</span>
            <div className="chips" style={{ marginTop: ".35rem" }}>
              {wines.map((w) => (
                <label key={w.position} className="chip chip-wide">
                  <input
                    type="radio" name="winePosition" value={w.position}
                    checked={position === w.position}
                    onChange={() => setPosition(w.position)}
                  />
                  <span>{w.position} · {w.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <span className="label">Who filled it in — {idSet.label}</span>
            <div className="row" style={{ gap: "1rem", marginTop: ".35rem", alignItems: "flex-start" }}>
              <div className="chips">{idSet.a.map((c) => <Chip key={c} name="idA" value={c} label={c} defaultChecked={fixing?.idA === c} />)}</div>
              <div className="chips" style={{ paddingLeft: "1rem", borderLeft: "1px solid var(--rule)" }}>
                {idSet.b.map((c) => <Chip key={c} name="idB" value={c} label={c} defaultChecked={fixing?.idB === c} />)}
              </div>
            </div>
          </div>
        </div>

        <div>
          <span className="label">Price guess — NOK</span>
          <div className="chips" style={{ marginTop: ".35rem" }}>
            {PRICE_BUCKETS.map((b, i) => (
              <Chip key={b} name="priceBucket" value={String(i)} label={b}
                    defaultChecked={fixing?.priceBucket === i} />
            ))}
          </div>
        </div>

        <div className="stack" style={{ gap: ".5rem" }}>
          <span className="label">Structure — 1 to 5</span>
          {STRUCTURE.map((row) => (
            <div key={row.attr} className="field-row">
              <div>
                <div className="small" style={{ color: "var(--ink)", fontWeight: 600 }}>{row.label}</div>
                <div className="small" style={{ fontSize: ".68rem" }}>{row.lo} → {row.hi}</div>
              </div>
              <div className="chips">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Chip key={n} name={row.attr} value={String(n)} label={String(n)}
                        defaultChecked={fixing?.[row.attr as keyof CardValues] === n} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div>
          <span className="label">Aroma &amp; flavour — {side === "RED" ? "red" : "white"} side</span>
          <div className="stack" style={{ gap: "1rem", marginTop: ".5rem" }}>
            {TIERS.map((tier) => (
              <div key={tier}>
                <div className="small" style={{ marginBottom: ".4rem" }}>
                  <b style={{ color: "var(--ink)" }}>{tier}</b> — {TIER_BLURB[tier]}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: ".7rem" }}>
                  {cats.filter((c) => c.tier === tier).map((c) => (
                    <div key={c.name}>
                      <div className="small" style={{ fontSize: ".7rem", marginBottom: ".2rem" }}>{c.name}</div>
                      <div className="chips">
                        {c.options.map((o) => (
                          <label key={o} className="chip chip-wide">
                            <input type="checkbox" name="flavours" value={`${c.name}|${o}`}
                                   defaultChecked={fixing?.flavours.includes(`${c.name}|${o}`)} />
                            <span>{o}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Rating — 1 to 10</span>
          <div className="chips" style={{ marginTop: ".35rem" }}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <Chip key={n} name="rating" value={String(n)} label={String(n)}
                    defaultChecked={fixing?.rating === n} />
            ))}
          </div>
        </div>

        <div className="row">
          <button className="btn btn-primary" type="submit">File this card</button>
          <span className="small">Wine and both name bubbles are required; everything else can be blank.</span>
        </div>
      </form>
    </details>
  );
}
