import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { WineRow } from "@/lib/tally";
import Deck, { type Slide } from "./Deck";
import { Leaderboard, Opening, Reveal, Room } from "./Slides";

export const dynamic = "force-dynamic";

/**
 * The big screen. One slide per screen, driven by the arrow keys.
 *
 * A wine contributes two slides — what it was, then what the room made of it —
 * and on a blind flight both stay covered until the host reveals that wine, so
 * the laptop is safe to leave facing the table.
 */
export default async function PresentPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ s?: string }>;
}) {
  const { id } = await params;
  const { s } = await searchParams;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      wines: {
        orderBy: { position: "asc" },
        include: { submissions: { include: { taster: true } } },
      },
      tasters: true,
    },
  });
  if (!event) notFound();

  const wines = event.wines as unknown as (WineRow & {
    priceNok: unknown; producer: string | null; vintage: number | null;
    region: string | null; appellation: string | null; grapes: string | null;
    tastingNote: string | null; teaser: string | null;
  })[];

  const slides: Slide[] = [
    {
      key: "open",
      kicker: "Tonight",
      title: event.name,
      node: <Opening name={event.name} wines={wines.length} tasters={event.tasters.length} />,
    },
  ];

  for (const wine of wines) {
    slides.push({
      key: `${wine.id}-reveal`,
      kicker: "The reveal",
      // the slide itself carries the name in full, so the header names the slot
      title: `Wine ${wine.position}`,
      node: (
        <Reveal
          wine={wine}
          revealMode={event.revealMode}
          priceNok={wine.priceNok}
          producer={wine.producer}
          vintage={wine.vintage}
          region={wine.appellation ?? wine.region}
          grapes={wine.grapes}
          note={wine.tastingNote}
        />
      ),
    });
    slides.push({
      key: `${wine.id}-room`,
      kicker: `Wine ${wine.position} · the room`,
      title: `What ${wine.submissions.length} of you found`,
      node: <Room wine={wine} revealMode={event.revealMode} />,
    });
  }

  slides.push({
    key: "leaderboard",
    kicker: "The whole night",
    title: "How close everyone got",
    node: <Leaderboard wines={wines} />,
  });

  const from = parseInt(s ?? "0", 10);
  const initial = Number.isFinite(from) ? Math.min(slides.length - 1, Math.max(0, from)) : 0;

  return <Deck slides={slides} eventId={event.id} eventName={event.name} initial={initial} />;
}
