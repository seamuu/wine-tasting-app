import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Every wine has a permanent scanner URL, independent of the host's cursor. */
export default async function PhoneScanner({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ wine?: string }>;
}) {
  const { id } = await params, query = await searchParams;
  const event = await prisma.event.findUnique({ where: { id }, include: {
    teams: true, wines: { orderBy: { position: "asc" }, include: { _count: { select: { submissions: true } } } },
  } });
  if (!event) notFound();
  if (!query.wine) {
    const current = event.wines.find(wine => wine.position === event.activePosition) ?? event.wines[0];
    if (!current) return <main className="page"><h1>Add the wines first</h1><p>The scanner will be ready once the tasting has a wine.</p><Link className="btn" href={`/t/${id}?tab=wines`}>Open tasting setup →</Link></main>;
    redirect(`/t/${id}/scan?wine=${current.position}`);
  }
  const wine = event.wines.find(wine => wine.position === query.wine);
  if (!wine) notFound();
  const options = new URLSearchParams({ wizard:"1", embedded:"1", event:id, ids:event.idSet,
    wines:String(event.wineCount), price:event.priceOnCard ? "1" : "0", expectedPosition:wine.position,
    expected:String(event.teams.reduce((sum, team) => sum + team.memberCount, 0)), collected:String(wine._count.submissions),
  });
  return <main className="phone-wizard-page"><iframe src={`/scan-v2.html?${options}`} title={`Wine ${wine.position} scanner`}
    allow="camera" className="phone-wizard-frame" /></main>;
}
