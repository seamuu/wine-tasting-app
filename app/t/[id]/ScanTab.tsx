"use client";

import { useEffect, useRef, useState } from "react";
import { saveScan, type ScanPayload } from "../../actions";
import { PRICE_BUCKETS, POSITIONS, type Position } from "@/lib/card";
import ManualCard from "./ManualCard";

type WineRow = { position: string; name: string; side: string; count: number };

/** Shape scan-v2.html posts up after it reads a card. */
type ScanGroup = { name: string; kind: "one" | "many"; value: string | string[] | null; flag: string | null };
type ScanResult = {
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
 * Turn the scanner's own vocabulary into a submission. The scanner reads its
 * labels off the printed card, so nothing here hardcodes flavour names — we
 * only need to know which groups are which kind of question.
 */
function toPayload(eventId: string, r: ScanResult, buckets: string[]): ScanPayload | { error: string } {
  if (r.error) return { error: "The card wasn't lined up — nothing was read." };

  const one = (name: string) => r.groups.find((g) => g.kind === "one" && g.name.toLowerCase() === name);
  const you = r.groups.filter((g) => g.name.toLowerCase() === "you are");

  const winePos = one("wine")?.value;
  if (typeof winePos !== "string" || !POSITIONS.includes(winePos as Position))
    return { error: "No wine letter was marked, so this card can't be filed." };
  if (you.length < 2 || typeof you[0].value !== "string" || typeof you[1].value !== "string")
    return { error: "The taster bubbles weren't both marked, so this card can't be filed." };

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

  const flags = r.groups.filter((g) => g.flag).map((g) => `${g.name}: ${g.flag}`);

  return {
    eventId,
    winePosition: winePos as Position,
    idA: you[0].value,
    idB: you[1].value,
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

export default function ScanTab({ eventId, wines, idSet, expected }: {
  eventId: string;
  wines: WineRow[];
  idSet: { label: string; a: string[]; b: string[] };
  expected: number | null;
}) {
  const [log, setLog] = useState<{ ok: boolean; text: string; at: number }[]>([]);
  const [busy, setBusy] = useState(false);
  // The scanner sends the buckets it read off the printed card, which is the
  // authority. Seeding with our own copy means a message that arrives without
  // them still files a price rather than silently scoring everyone zero.
  const bucketsRef = useRef<string[]>([...PRICE_BUCKETS]);

  useEffect(() => {
    async function onMessage(ev: MessageEvent) {
      const data = ev.data as { type?: string; result?: ScanResult; buckets?: string[] };
      if (!data || data.type !== "card-v2-scan" || !data.result) return;
      if (data.buckets) bucketsRef.current = data.buckets;

      setBusy(true);
      const payload = toPayload(eventId, data.result, bucketsRef.current);
      if ("error" in payload) {
        setLog((l) => [{ ok: false, text: payload.error, at: Date.now() }, ...l].slice(0, 12));
        setBusy(false);
        return;
      }
      const res = await saveScan(payload);
      setLog((l) => [
        res.ok
          ? { ok: true, text: `${res.taster} → Wine ${payload.winePosition}${payload.needsReview ? " (flagged for review)" : ""}`, at: Date.now() }
          : { ok: false, text: res.error, at: Date.now() },
        ...l,
      ].slice(0, 12));
      setBusy(false);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [eventId]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(280px,340px)", gap: "2.5rem", alignItems: "start" }}>
      <section>
        <div className="section-title">Photograph a card</div>
        <p className="lede" style={{ marginBottom: "1rem" }}>
          Every card that reads cleanly is filed straight into this tasting — the card says which
          wine and which taster, so there is nothing to choose.
        </p>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <iframe
            src="/scan-v2.html?embedded=1"
            title="Card scanner"
            style={{ width: "100%", height: "min(78vh, 900px)", border: 0, display: "block" }}
            allow="camera"
          />
        </div>

        <ManualCard eventId={eventId} idSet={idSet} wines={wines} />
      </section>

      <section className="stack" style={{ gap: "1.6rem" }}>
        <div>
          <div className="section-title">Cards in</div>
          {wines.length === 0 ? (
            <p className="small">Add a wine first, or scans will have nowhere to go.</p>
          ) : (
            <div className="stack" style={{ gap: ".5rem" }}>
              {wines.map((w) => {
                const done = expected != null && w.count >= expected;
                return (
                  <div key={w.position} className="spread">
                    <span className="small" style={{ color: "var(--ink)" }}>
                      <b>{w.position}</b> · {w.name}
                    </span>
                    <span className={`pill tabular ${done ? "pill-olive" : ""}`}>
                      {expected == null ? w.count : `${w.count}/${expected}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="section-title">Just scanned {busy ? "· saving…" : ""}</div>
          {log.length === 0 ? (
            <p className="small">Nothing yet this session.</p>
          ) : (
            <div className="stack" style={{ gap: ".45rem" }}>
              {log.map((l) => (
                <p key={l.at} className="small" style={{ color: l.ok ? "var(--olive)" : "var(--warn)" }}>
                  {l.ok ? "✓" : "!"} {l.text}
                </p>
              ))}
            </div>
          )}
          <p className="small" style={{ marginTop: ".8rem" }}>
            Re-scanning the same taster and wine replaces the earlier read rather than adding a
            second one, so a bad photo is safe to redo.
          </p>
        </div>
      </section>
    </div>
  );
}
