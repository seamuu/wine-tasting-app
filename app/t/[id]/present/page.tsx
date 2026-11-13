import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RESULT_STEPS, STEP_LABELS, isRoundStep, revealedThrough } from "@/lib/rounds";
import { CoveredWine, WineStory, TastingResults, QuizResults, Standings } from "../RoundResults";
import LiveDisplay, { FullscreenButton } from "./LiveDisplay";

export const dynamic = "force-dynamic";

/** The room receives only rendered, revealed results. Visiting a future result
 * URL never reveals a bottle or changes the host's saved position. */
export default async function PresentPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ wine?: string; step?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const event = await prisma.event.findUnique({ where: { id }, include: {
    wines: { orderBy: { position: "asc" }, include: { submissions: { include: { taster: true } } } },
    teams: { orderBy: { name: "asc" }, include: { guesses: true, mapGuesses: true } },
  } });
  if (!event) notFound();
  const active = event.wines.find((wine) => wine.position === event.activePosition) ?? event.wines[0];
  const reviewed = event.wines.find((wine) => wine.position === query.wine && wine.stage === "REVEALED");
  const following = !reviewed;
  const wine = reviewed ?? active;
  const requestedStep = isRoundStep(query.step) && RESULT_STEPS.includes(query.step) ? query.step : "REVEAL";
  const step = following ? event.runStep : requestedStep;
  const covered = !wine || wine.stage !== "REVEALED" || step === "COLLECT" || step === "ANSWERS";
  const base = `/t/${id}/present`;
  const resultIndex = RESULT_STEPS.indexOf(isRoundStep(step) ? step : "REVEAL");
  return <LiveDisplay following={following}>
    <div className="room-display">
      <header className="room-header"><div><div className="eyebrow">Wine Flight · {event.name}</div>
        <h1>{covered ? wine ? `Wine ${wine.position}` : "Blind wine tasting" : `${wine.position} · ${STEP_LABELS[step as keyof typeof STEP_LABELS]}`}</h1></div>
        <span className={`pill ${following ? "pill-olive" : ""}`}>{following ? "● Following the host" : "Reviewing a revealed wine"}</span>
      </header>
      <nav className="room-flight" aria-label="Wines">
        {event.wines.map((item) => item.stage === "REVEALED"
          ? <Link key={item.id} className={`wine-token ${wine?.id === item.id ? "is-selected" : ""}`} href={`${base}?wine=${item.position}&step=REVEAL`} aria-label={`Review wine ${item.position}`}>{item.position}</Link>
          : <span className={`wine-token ${wine?.id === item.id ? "is-selected" : ""}`} key={item.id}>{item.position}</span>)}
        {!following && <Link className="btn btn-sm" href={base}>Follow the host →</Link>}
      </nav>
      <main className="room-content">
        {covered ? <CoveredWine position={wine?.position ?? "?"}>{
          !wine ? "The host is setting up your wine quiz. Settle in and pick a team name."
            : step === "ANSWERS" ? "The cards are in. Teams, hand in your answers for this glass. The reveal is coming."
              : "Taste without the label. Mark your card, compare notes with your team, and choose your quiz answers."
        }</CoveredWine> : <>
          {step === "REVEAL" && <WineStory map={event.mapMode} wine={wine} />}
          {step === "TASTING" && <TastingResults wine={wine} />}
          {step === "QUIZ" && <QuizResults map={event.mapMode} eventId={id} allWines={event.wines} wine={wine} teams={event.teams} />}
          {step === "STANDINGS" && <Standings map={event.mapMode} allWines={event.wines} wines={revealedThrough(event.wines, wine.position)} teams={event.teams} />}
        </>}
      </main>
      <footer className="room-footer"><nav className="row" aria-label={`Pages for wine ${wine?.position ?? ""}`}>
        {!covered && RESULT_STEPS.map((target) => <Link key={target} href={`${base}?wine=${wine.position}&step=${target}`} className="room-result-link" aria-current={step === target ? "page" : undefined}>{STEP_LABELS[target]}</Link>)}
      </nav><nav className="row room-page-navigation" aria-label="Previous and next page">
        {!covered && resultIndex > 0 && <Link className="btn btn-sm" href={`${base}?wine=${wine.position}&step=${RESULT_STEPS[resultIndex - 1]}`} aria-label={`Previous page: ${STEP_LABELS[RESULT_STEPS[resultIndex - 1]]}`}>← Previous page</Link>}
        {!covered && resultIndex < RESULT_STEPS.length - 1 && <Link className="btn btn-sm" href={`${base}?wine=${wine.position}&step=${RESULT_STEPS[resultIndex + 1]}`}>Next page →</Link>}
      </nav><div className="row"><FullscreenButton /><Link className="small" href={`/t/${id}/run`}>Host controls</Link></div></footer>
    </div>
  </LiveDisplay>;
}
