"use client";

import { useEffect, useState } from "react";
import type { RecentScan } from "./ScanTab";

export default function CollectionPanel({ eventId, position, initial, phoneUrl, qr }: {
  eventId: string; position: string;
  initial: { count: number; expected: number; reviewed: number; cards: RecentScan[] };
  phoneUrl: string; qr: string;
}) {
  const [collection, setCollection] = useState(initial);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let fetching = false;
    const update = async () => {
      if (fetching || document.visibilityState !== "visible") return;
      fetching = true;
      try {
        const response = await fetch(`/api/scan?eventId=${encodeURIComponent(eventId)}&position=${position}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Cannot check cards");
        const latest = await response.json() as typeof initial;
        if (controller.signal.aborted) return;
        setCollection(latest); setOffline(false);
        window.dispatchEvent(new CustomEvent("wine-flight:card-count", { detail: { eventId, position, count: latest.count } }));
      } catch { if (!controller.signal.aborted) setOffline(true); }
      finally { fetching = false; }
    };
    void update();
    const timer = setInterval(update, 2000);
    document.addEventListener("visibilitychange", update);
    return () => { controller.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, [eventId, position]);
  const complete = collection.expected > 0 && collection.count >= collection.expected;
  return <section className="collection-panel">
    <div className={`collection-status ${complete ? "is-complete" : ""}`} role="status" aria-live="polite">
      <span className="label">Wine {position} · tasting cards</span>
      <h3>{complete ? "✓ All cards collected" : `${collection.count} of ${collection.expected} cards collected`}</h3>
      <progress value={Math.min(collection.count, collection.expected)} max={Math.max(1, collection.expected)} aria-label={`Cards collected for wine ${position}`} />
      <p>{complete ? "Ready for team answers." : `${Math.max(0, collection.expected - collection.count)} still to collect. Confirm each card on the phone to add it here.`}</p>
      {collection.reviewed > 0 && <p className="flag">{collection.reviewed} {collection.reviewed === 1 ? "card needs" : "cards need"} a check.</p>}
      {offline && <p className="flag">Connection interrupted. Retrying…</p>}
    </div>
    <details className="phone-connection card" open={!complete}>
      <summary>Scan with your phone</summary>
      <div className="phone-connect-content">
        {/* Generated locally; the tasting URL is never sent to a QR service. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} width={180} height={180} alt="QR code to open this tasting’s phone scanner" />
        <div><p>Point your phone camera at the QR code. Keep this screen open to watch the cards come in.</p>
          <p className="small">On a local setup, use the same Wi-Fi and keep the laptop awake.</p>
          <a className="btn" href={`/t/${eventId}/scan?wine=${position}`}>Open wine {position} scanner →</a>
          <details className="phone-link"><summary>Or copy the phone address</summary><a href={phoneUrl}>{phoneUrl}</a></details>
        </div>
      </div>
    </details>
    {collection.cards.length > 0 && <details className="collection-recent"><summary>Saved cards · {collection.cards.length}</summary>
      <ul>{collection.cards.map(card => <li key={card.id}><span>{card.taster}{card.status === "NEEDS_REVIEW" && <span className="flag"> · needs a check</span>}</span>
        <a href={`?wine=${position}&step=COLLECT&fix=${card.id}#manual-card`}>Check card</a></li>)}</ul>
    </details>}
  </section>;
}
