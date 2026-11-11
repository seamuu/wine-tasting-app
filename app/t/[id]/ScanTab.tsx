"use client";

import { useEffect, useRef, useState } from "react";
import { saveScan, deleteSubmission } from "../../actions";
import { PRICE_BUCKETS } from "@/lib/card";
import { toPayload, type ScanResult, type WineRow } from "@/lib/scan-payload";
import ManualCard, { type CardValues } from "./ManualCard";

export type RecentScan = {
  id: string; at: string; position: string; wine: string;
  taster: string; status: string; note: string | null;
};

export default function ScanTab({ eventId, wines, idSet, idSetKey, wineCount, priceOnCard, expected, recent, fixing }: {
  eventId: string;
  wines: WineRow[];
  idSet: { label: string; a: string[]; b: string[] };
  idSetKey: string;
  wineCount: number;
  priceOnCard: boolean;
  expected: number | null;
  recent: RecentScan[];
  fixing: CardValues | null;
}) {
  const [log, setLog] = useState<{ ok: boolean; text: string; at: number }[]>([]);
  const [busy, setBusy] = useState(false);
  // The scanner sends the buckets it read off the printed card, which is the
  // authority. Seeding with our own copy means a message that arrives without
  // them still files a price rather than silently scoring everyone zero.
  const bucketsRef = useRef<string[]>([...PRICE_BUCKETS]);
  // The message handler is bound once, so it needs the current flight, not the
  // one that happened to be on screen when the tab mounted.
  const winesRef = useRef<WineRow[]>(wines);
  useEffect(() => { winesRef.current = wines; }, [wines]);

  useEffect(() => {
    async function onMessage(ev: MessageEvent) {
      const data = ev.data as { type?: string; result?: ScanResult; buckets?: string[] };
      if (!data || data.type !== "card-v2-scan" || !data.result) return;
      if (data.buckets) bucketsRef.current = data.buckets;

      setBusy(true);
      const payload = toPayload(eventId, data.result, bucketsRef.current, winesRef.current);
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
    <div className="split">
      <section>
        <div className="section-title">Photograph a card</div>
        <p className="lede" style={{ marginBottom: "1rem" }}>
          Every card that reads cleanly is filed straight into this tasting — the card says which
          wine and which taster, so there is nothing to choose.
        </p>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <iframe
            src={`/scan-v2.html?embedded=1&event=${eventId}&ids=${encodeURIComponent(idSetKey)}`
              + `&wines=${wineCount}&price=${priceOnCard ? 1 : 0}&b=1848`}
            title="Card scanner"
            style={{ width: "100%", height: "min(78vh, 900px)", border: 0, display: "block" }}
            allow="camera"
          />
        </div>

        <section style={{ marginTop: "1.5rem" }}>
          <div className="section-title">Cards in, most recent first</div>
          {/* Read back out of the database rather than kept in the page, so it
              survives a reload and shows cards the scanner filed on its own. */}
          {recent.length === 0
            ? <p className="small">Nothing filed yet.</p>
            : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {recent.map((r) => (
                  <li key={r.id} className="spread"
                      style={{ padding: ".45rem 0", borderBottom: "1px solid var(--paper-3)" }}>
                    <span>
                      <b>{r.taster}</b>{" → "}Wine {r.position}
                      <span className="small">{" · "}{r.wine}</span>
                      {r.status === "NEEDS_REVIEW" && (
                        <span className="pill pill-warn" style={{ marginLeft: ".4rem", fontSize: ".65rem" }}>
                          {r.note ?? "check"}
                        </span>
                      )}
                    </span>
                    <span className="row" style={{ gap: ".3rem" }}>
                      <a className="btn btn-sm" href={`?tab=scan&fix=${r.id}#manual-card`}
                         title="Open this card filled in, and correct it">Fix</a>
                      <form action={deleteSubmission}>
                        <input type="hidden" name="submissionId" value={r.id} />
                        <button className="btn btn-sm btn-quiet" type="submit"
                                title="Remove this card">Undo</button>
                      </form>
                    </span>
                  </li>
                ))}
              </ul>
            )}
        </section>

        <ManualCard eventId={eventId} idSet={idSet} wines={wines} fixing={fixing} />
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
