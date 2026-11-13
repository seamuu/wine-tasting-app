import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SetupTab from "./SetupTab";
import WinesTab from "./WinesTab";
import ResultsTab from "./ResultsTab";
import { Standings } from "./RoundResults";

export const dynamic = "force-dynamic";

const TABS = [
  ["setup", "Setup"],
  ["wines", "Wines"],
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
  searchParams: Promise<{ tab?: string; lookup?: string; manual?: string; fix?: string; teamError?: string; refresh?: string; settingsError?: string; mapError?: string; step?: string; reset?: string }>;
}) {
  const { id } = await params;
  const { tab = "setup", lookup, manual, fix, teamError, refresh, settingsError, mapError, step, reset } = await searchParams;


  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      wines: {
        orderBy: { position: "asc" },
        include: { submissions: { include: { taster: true } } },
      },
      tasters: { orderBy: [{ idA: "asc" }, { idB: "asc" }] },
      teams: { orderBy: { name: "asc" }, include: { guesses: true, mapGuesses: true } },
    },
  });
  if (!event) notFound();

  if (tab === "scan" || tab === "quiz") {
    const step = tab === "scan" ? "COLLECT" : "ANSWERS";
    const correcting = fix ? event.wines.find((wine) => wine.submissions.some((submission) => submission.id === fix)) : null;
    redirect(`/t/${id}/run?step=${step}${correcting ? `&wine=${correcting.position}` : ""}${fix ? `&fix=${encodeURIComponent(fix)}` : ""}${manual ? `&manual=${encodeURIComponent(manual)}` : ""}`);
  }


  return (
    <main className="page">
      <div className="masthead tasting-header">
        <div>
          <div className="eyebrow">
            <Link href="/" style={{ textDecoration: "none" }}>Wine Flight</Link> · tasting
          </div>
          <h1>{event.name}</h1>
        </div>
        <div className="row">
          <Link className="btn btn-primary" href={`/t/${event.id}/run`}>{event.wines.some(wine => wine.stage !== "UPCOMING") ? "Continue the quiz →" : "Start the quiz →"}</Link>
        </div>
      </div>

      <nav className="tabs">
        {TABS.filter(([key]) => key !== "results" || event.wines.some(wine => wine.stage === "REVEALED")).map(([key, label]) => (
          <Link
            key={key}
            href={`/t/${event.id}?tab=${key}`}
            aria-current={tab === key ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>

      {reset === "saved" && <p className="note note-olive" role="status">Results cleared. The tasting is back at wine A. Wines and teams are still saved.</p>}
      {lookup === "occupied" && <p className="note">The flight has already started or that letter is taken. Existing bottles and tasting cards have been kept.</p>}
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

      {teamError && <p className="note" role="alert">{teamError === "duplicate" ? "That team name is already in use. Pick another name." : "Give the team a name and a size between 1 and 100."}</p>}
      {settingsError && <p className="note" role="alert">{settingsError === "map" ? "The map area is fixed once team answers are collected. Existing answers and paper have been kept." : "The flight and card layout are fixed after the first cards or quiz answers are collected. Your saved cards have been kept."}</p>}
      {mapError && <p className="note" role="alert">Choose a location inside the selected map and confirm it. Your previous reference has been kept.</p>}
      {refresh && <p className={`note ${refresh === "saved" ? "note-olive" : ""}`} role="status">{refresh === "saved" ? "Bottle facts refreshed from Vinmonopolet." : "Could not refresh this bottle. Your existing facts are still saved."}</p>}
      {tab === "setup" && <SetupTab event={event} step={step} />}
      {tab === "wines" && <WinesTab event={event} />}
      {tab === "results" && <div className="stack" style={{ gap: "2rem" }}>
        <Standings map={event.mapMode} allWines={event.wines} wines={event.wines.filter((wine) => wine.stage === "REVEALED")} teams={event.teams} />
        <details className="card"><summary>Individual tasting cards &amp; corrections</summary>
          <ResultsTab event={{ ...event, wines: event.wines.filter((wine) => wine.stage === "REVEALED") }} />
        </details>
      </div>}
    </main>
  );
}
