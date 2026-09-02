import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ScanPanel from "./ScanPanel";
import TasterNameField from "./TasterNameField";

export const dynamic = "force-dynamic";

function average(values: (number | null)[]) {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return null;
  return present.reduce((a, b) => a + b, 0) / present.length;
}

function Bar({ value, max }: { value: number | null; max: number }) {
  if (value === null) return <span className="text-xs text-muted">—</span>;
  const pct = Math.max(4, Math.round((value / max) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-line">
        <div className="h-2 rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 font-mono text-xs tabular-nums text-muted">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

export default async function EventDashboard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      wines: { orderBy: { flightPosition: "asc" } },
      cards: { include: { ratings: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!event) notFound();

  const ratingsByWine = new Map(event.wines.map((w) => [w.id, [] as typeof event.cards[number]["ratings"]]));
  for (const card of event.cards) {
    for (const rating of card.ratings) {
      ratingsByWine.get(rating.wineId)?.push(rating);
    }
  }

  const wineStats = event.wines.map((wine) => {
    const ratings = ratingsByWine.get(wine.id) ?? [];
    return {
      wine,
      overall: average(ratings.map((r) => r.overall)),
      body: average(ratings.map((r) => r.body)),
      acidity: average(ratings.map((r) => r.acidity)),
      tannin: average(ratings.map((r) => r.tannin)),
      sweetness: average(ratings.map((r) => r.sweetness)),
      count: ratings.length,
    };
  });
  const leaderboard = [...wineStats].sort(
    (a, b) => (b.overall ?? -1) - (a.overall ?? -1)
  );

  const scanCounts = { PENDING: 0, NEEDS_REVIEW: 0, CONFIRMED: 0 };
  for (const c of event.cards) scanCounts[c.scanStatus]++;

  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-widest text-accent">
          {new Date(event.date).toLocaleDateString()}
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
        <p className="text-sm text-muted">
          {scanCounts.CONFIRMED} confirmed &middot; {scanCounts.NEEDS_REVIEW} need review &middot;{" "}
          {scanCounts.PENDING} pending &middot; {event.cards.length} card
          {event.cards.length === 1 ? "" : "s"} total
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Leaderboard</h2>
        <ol className="flex flex-col gap-2">
          {leaderboard.map((s, i) => (
            <li
              key={s.wine.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted">#{i + 1}</span>
                <div>
                  <p className="font-medium">
                    {s.wine.name}
                    <span className="ml-2 font-mono text-xs text-muted">
                      ({s.wine.flightPosition})
                    </span>
                  </p>
                  {s.wine.producer && (
                    <p className="text-xs text-muted">
                      {s.wine.producer}
                      {s.wine.vintage ? ` · ${s.wine.vintage}` : ""}
                    </p>
                  )}
                </div>
              </div>
              <span className="font-mono text-lg font-semibold text-accent">
                {s.overall !== null ? s.overall.toFixed(1) : "—"}
                <span className="text-xs text-muted">/10</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Flavor profile</h2>
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left font-mono text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2">Wine</th>
                <th className="px-4 py-2">Body</th>
                <th className="px-4 py-2">Acidity</th>
                <th className="px-4 py-2">Tannin</th>
                <th className="px-4 py-2">Sweetness</th>
              </tr>
            </thead>
            <tbody>
              {wineStats.map((s) => (
                <tr key={s.wine.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2 font-medium">{s.wine.name}</td>
                  <td className="w-32 px-4 py-2"><Bar value={s.body} max={5} /></td>
                  <td className="w-32 px-4 py-2"><Bar value={s.acidity} max={5} /></td>
                  <td className="w-32 px-4 py-2"><Bar value={s.tannin} max={5} /></td>
                  <td className="w-32 px-4 py-2"><Bar value={s.sweetness} max={5} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Taster roster</h2>
        <p className="text-sm text-muted">
          Each card only carries a blind Color+Animal ID — put a real name
          next to it here whenever you like.
        </p>
        {event.cards.length === 0 ? (
          <p className="text-sm text-muted">No cards scanned yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {event.cards.map((card) => (
              <li
                key={card.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm">
                    {card.tasterColor} {card.tasterAnimal}
                  </span>
                  <TasterNameField cardId={card.id} initialName={card.tasterName ?? ""} />
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    card.scanStatus === "CONFIRMED"
                      ? "bg-accent-soft text-accent"
                      : "bg-line text-muted"
                  }`}
                >
                  {card.scanStatus.replace("_", " ").toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Scan a card</h2>
        <p className="text-sm text-muted">
          Photograph a filled card below — a confirmed read saves straight
          into this event.
        </p>
        <ScanPanel eventId={event.id} />
      </section>
    </main>
  );
}
