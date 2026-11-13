import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WineStory } from "../RoundResults";

export const dynamic = "force-dynamic";

/** Host-only workflow, like Wines. Reading a preview never advances a round
 * or changes what the separate guest display can show. */
export default async function RevealPreview({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ wine?: string }>;
}) {
  const { id } = await params;
  const { wine: position } = await searchParams;
  const event = await prisma.event.findUnique({ where: { id }, include: {
    wines: { orderBy: { position: "asc" }, include: { submissions: { include: { taster: true } } } },
  } });
  if (!event) notFound();
  const wine = event.wines.find(item => item.position === position) ?? event.wines[0];
  return <main className="page">
    <header className="masthead"><div><div className="eyebrow">{event.name} · host preview</div><h1>Wine reveals</h1></div>
      <div className="row"><Link className="btn" href={`/t/${id}/quiz-preview`}>Map &amp; quiz mock-up →</Link><Link className="btn" href={`/t/${id}?tab=wines`}>Back to wines</Link></div>
    </header>
    <p className="note">These are previews. The tasting and guest screen stay at their current step.</p>
    <p className="small">Vintages and analysis come from the current Vinmonopolet listings. Check the bottle labels before the tasting.</p>
    <nav className="row reveal-preview-nav" aria-label="Preview each bottle">
      {event.wines.map(item => <Link key={item.id} href={`/t/${id}/preview?wine=${item.position}`} className={`btn btn-sm ${item.id === wine?.id ? "btn-primary" : ""}`} aria-current={item.id === wine?.id ? "page" : undefined}>{item.position} · {item.name}</Link>)}
    </nav>
    {wine ? <WineStory wine={wine} map={event.mapMode} preview /> : <p className="empty">Add wines to preview their reveals.</p>}
  </main>;
}
