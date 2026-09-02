import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const events = await prisma.event.findMany({
    orderBy: { date: "desc" },
    include: { wines: true, cards: true },
  });

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-accent">Events</span>
          <h1 className="text-2xl font-semibold tracking-tight">Tastings</h1>
        </div>
        <Link
          href="/events/new"
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-soft"
        >
          New event
        </Link>
      </header>

      {events.length === 0 ? (
        <p className="text-sm text-muted">
          No events yet — <Link href="/events/new" className="underline">create one</Link> to get started.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((e) => (
            <li key={e.id}>
              <Link
                href={`/events/${e.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4 hover:border-accent"
              >
                <div>
                  <p className="font-semibold">{e.name}</p>
                  <p className="text-sm text-muted">
                    {new Date(e.date).toLocaleDateString()} &middot; {e.wines.length} wines
                  </p>
                </div>
                <span className="font-mono text-xs text-muted">
                  {e.cards.length} card{e.cards.length === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
