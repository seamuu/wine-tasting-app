"use client";

import { useEffect, useRef, useState } from "react";
import { deleteSubmission } from "../../actions";
import { type WineRow } from "@/lib/scan-payload";
import ManualCard, { type CardValues } from "./ManualCard";

export type RecentScan = {
  id: string; at: string; position: string; wine: string;
  taster: string; status: string; note: string | null;
};

export default function ScanTab({ eventId, wines, idSet, idSetKey, wineCount, priceOnCard, expected, recent, fixing, activePosition, returnTo }: {
  eventId: string;
  wines: WineRow[];
  idSet: { label: string; a: string[]; b: string[] };
  idSetKey: string;
  wineCount: number;
  priceOnCard: boolean;
  expected: number | null;
  recent: RecentScan[];
  fixing: CardValues | null;
  activePosition?: string;
  returnTo?: "run";
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [savedCards, setSavedCards] = useState<RecentScan[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const liveRecent = [...savedCards, ...recent.filter(card => !savedCards.some(saved => saved.id === card.id))]
    .sort((a, b) => b.at.localeCompare(a.at));
  const visibleWines = (activePosition ? wines.filter((wine) => wine.position === activePosition) : wines)
    .map(wine => ({ ...wine, count: counts[wine.position] ?? wine.count }));
  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      if (ev.origin !== window.location.origin || ev.source !== iframeRef.current?.contentWindow) return;
      const data = ev.data as { type?: string; eventId?: string; error?: string; count?: number; card?: RecentScan };
      if (data.eventId !== eventId) return;
      if (data.type !== "card-v2-saved" || !data.card || typeof data.count !== "number") return;
      const card = data.card, count = data.count;
      if (activePosition && card.position !== activePosition) return;
      setSavedCards(cards => [card, ...cards.filter(saved => saved.id !== card.id)]);
      setCounts(counts => ({ ...counts, [card.position]: count }));
      window.dispatchEvent(new CustomEvent('wine-flight:card-count', { detail: { eventId, position: card.position, count } }));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [eventId, activePosition]);
  const count = visibleWines[0]?.count ?? 0;
  const complete = expected != null && expected > 0 && count >= expected;
  return <section className="scanner-workspace">
    {!fixing && <>
      <div className={`scanner-progress ${complete ? "is-complete" : ""}`} role="status" aria-live="polite">
        {complete ? "✓ All cards collected" : `${count}/${expected ?? "?"} cards saved`}
      </div>
      <p className="small">Names are optional. Confirm each scan, then continue when you’re ready.</p>
      <div className="card scanner-frame">
        <iframe ref={iframeRef}
          src={`/scan-v2.html?embedded=1&event=${eventId}&ids=${encodeURIComponent(idSetKey)}`
            + `&wines=${wineCount}&price=${priceOnCard ? 1 : 0}&expected=${expected ?? 0}&b=review`
            + (activePosition ? `&expectedPosition=${encodeURIComponent(activePosition)}` : "")}
          title="Card scanner" style={{ width:"100%", height:"82dvh", minHeight:520, border:0, display:"block" }} allow="camera" />
      </div>
    </>}
    {fixing ? <ManualCard eventId={eventId} idSet={idSet} wines={visibleWines} fixing={fixing} returnTo={returnTo} priceOnCard={priceOnCard} />
      : <details className="scanner-corrections"><summary>Saved cards &amp; corrections · {liveRecent.length}</summary>
        {liveRecent.length > 0 && <ul className="scanner-saved-list">{liveRecent.map(card => <li key={card.id}>
          <span>{card.taster}{card.status === "NEEDS_REVIEW" && <span className="flag"> · {card.note ?? "needs a check"}</span>}</span>
          <span className="row">
            <a href={`/t/${eventId}/run?wine=${card.position}&step=COLLECT&fix=${card.id}#manual-card`}>Fix</a>
            <form action={deleteSubmission}><input type="hidden" name="submissionId" value={card.id} /><button className="btn btn-sm btn-quiet" type="submit">Undo</button></form>
          </span>
        </li>)}</ul>}
        <ManualCard eventId={eventId} idSet={idSet} wines={visibleWines} fixing={null} returnTo={returnTo} priceOnCard={priceOnCard} />
      </details>}
  </section>;
}
