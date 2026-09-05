import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ID_SETS } from "@/lib/card";
import SetupTab from "./SetupTab";
import WinesTab from "./WinesTab";
import ScanTab from "./ScanTab";
import ResultsTab from "./ResultsTab";

export const dynamic = "force-dynamic";

const TABS = [
  ["setup", "Setup"],
  ["wines", "Wines"],
  ["scan", "Scan cards"],
  ["results", "Results"],
] as const;

const MANUAL_MESSAGE: Record<string, string> = {
  saved: "Card filed by hand.",
  who: "That card needs both name bubbles before it can be filed.",
  nowine: "There is no wine on that letter yet.",
};

export default async function TastingPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; lookup?: string; manual?: string }>;
}) {
  const { id } = await params;
  const { tab = "setup", lookup, manual } = await searchParams;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      wines: {
        orderBy: { position: "asc" },
        include: { submissions: { include: { taster: true } } },
      },
      tasters: { orderBy: [{ idA: "asc" }, { idB: "asc" }] },
    },
  });
  if (!event) notFound();

  const idSet = ID_SETS[event.idSet] ?? ID_SETS.house;
  const scanned = event.wines.reduce((n, w) => n + w.submissions.length, 0);

  return (
    <main className="page">
      <div className="masthead">
        <div>
          <div className="eyebrow">
            <Link href="/" style={{ textDecoration: "none" }}>Wine Flight</Link> · tasting
          </div>
          <h1>{event.name}</h1>
          <p className="small" style={{ marginTop: ".4rem" }}>
            {event.wines.length} of {event.wineCount} {event.wineCount === 1 ? "wine" : "wines"} ·{" "}
            {scanned} {scanned === 1 ? "card" : "cards"} scanned ·{" "}
            {event.guestCount ? `${event.guestCount} people · ` : ""}
            named by <b>{idSet.label}</b> ·{" "}
            {event.revealMode === "BLIND" ? "blind until you reveal" : "wine shown from the start"}
          </p>
        </div>
        <div className="row">
          <Link className="btn" href={`/t/${event.id}/run`}>Run it →</Link>
          <Link className="btn btn-primary" href={`/t/${event.id}/present`}>Big screen ↗</Link>
        </div>
      </div>

      <nav className="tabs">
        {TABS.map(([key, label]) => (
          <Link
            key={key}
            href={`/t/${event.id}?tab=${key}`}
            aria-current={tab === key ? "page" : undefined}
          >
            {label}
            {key === "scan" && scanned > 0 ? ` · ${scanned}` : ""}
          </Link>
        ))}
      </nav>

      {lookup === "failed" && (
        <p className="note" style={{ marginBottom: "1.4rem" }}>
          Couldn&rsquo;t read that Vinmonopolet page, so the wine was added with just its name.
          Fill in the price bucket by hand and everything else still works.
        </p>
      )}
      {manual && MANUAL_MESSAGE[manual] && (
        <p className={`note ${manual === "saved" ? "note-olive" : ""}`} style={{ marginBottom: "1.4rem" }}>
          {MANUAL_MESSAGE[manual]}
        </p>
      )}

      {tab === "setup" && <SetupTab event={event} />}
      {tab === "wines" && <WinesTab event={event} />}
      {tab === "scan" && (
        <ScanTab
          eventId={event.id}
          idSet={idSet}
          expected={event.guestCount}
          wines={event.wines.map((w) => ({
            position: w.position, name: w.name, side: w.side, count: w.submissions.length,
          }))}
        />
      )}
      {tab === "results" && <ResultsTab event={event} />}
    </main>
  );
}
