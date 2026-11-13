import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import { ID_SETS } from "@/lib/card";
import ManualCard from "../ManualCard";

export const dynamic = "force-dynamic";

/** Every wine has a permanent scanner URL, independent of the host's cursor. */
export default async function PhoneScanner({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ wine?: string; mode?: string; manual?: string }>;
}) {
  const { id } = await params, query = await searchParams;
  const event = await prisma.event.findUnique({ where: { id }, include: {
    teams: true, wines: { orderBy: { position: "asc" }, include: { _count: { select: { submissions: true } } } },
  } });
  if (!event) notFound();
  if (!query.wine) {
    const current = event.wines.find(wine => wine.position === event.activePosition) ?? event.wines[0];
    if (!current) return <main className="page"><h1>Add the wines first</h1><p>The scanner will be ready once the tasting has a wine.</p><Link className="btn" href={`/t/${id}?tab=wines`}>Open tasting setup →</Link></main>;
    redirect(`/t/${id}/scan?wine=${current.position}${query.mode === "manual" ? "&mode=manual" : ""}`);
  }
  const wine = event.wines.find(wine => wine.position === query.wine);
  if (!wine) notFound();
  const manual = query.mode === "manual";
  const base = `/t/${id}/scan?wine=${wine.position}`;
  const modes = <nav className="phone-entry-nav" aria-label="Card entry method">
    <Link className={`btn btn-sm ${manual ? "" : "btn-primary"}`} href={base} aria-current={!manual ? "page" : undefined}>Scan a card</Link>
    <Link className={`btn btn-sm ${manual ? "btn-primary" : ""}`} href={`${base}&mode=manual`} aria-current={manual ? "page" : undefined}>Enter card manually</Link>
  </nav>;
  if (manual) {
    const entryId = randomUUID();
    return <main className="page phone-manual-page">
      {modes}
      <header className="phone-manual-heading"><span className="label">Tasting cards</span><h1>Wine {wine.position}</h1>
        <p className="small">{wine._count.submissions} {wine._count.submissions === 1 ? "card" : "cards"} saved</p></header>
      {query.manual === "saved" && <p className="note note-olive" role="status">Card saved. Enter the next card below.</p>}
      {query.manual === "nowine" && <p className="note" role="alert">That wine is missing from the tasting.</p>}
      <ManualCard key={entryId} entryId={entryId} eventId={id} idSet={ID_SETS[event.idSet] ?? ID_SETS.house}
        wines={[{ position: wine.position, name: wine.side === "RED" ? "Red card" : "White card", side: wine.side }]} expanded
        returnTo="phone" priceOnCard={event.priceOnCard} submitLabel="Save card" />
      <Link className="btn" href={`/t/${id}/run`}>Back to host controls →</Link>
    </main>;
  }
  const options = new URLSearchParams({ wizard:"1", embedded:"1", event:id, ids:event.idSet,
    wines:String(event.wineCount), price:event.priceOnCard ? "1" : "0", expectedPosition:wine.position,
    expected:String(event.teams.reduce((sum, team) => sum + team.memberCount, 0)), collected:String(wine._count.submissions),
  });
  return <main className="phone-wizard-page">{modes}<iframe src={`/scan-v2.html?${options}`} title={`Wine ${wine.position} scanner`}
    allow="camera" className="phone-wizard-frame" /></main>;
}
