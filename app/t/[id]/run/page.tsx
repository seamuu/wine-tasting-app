import Link from "next/link";
import { isDemoTasting } from "@/lib/demo";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ID_SETS, POSITIONS } from "@/lib/card";
import { mapEnabled, mapRoundReady, parseCell } from "@/lib/map";
import { CATEGORIES, playable } from "@/lib/quiz";
import { ROUND_STEPS, STEP_LABELS, isRoundStep, nextRound, revealedThrough } from "@/lib/rounds";
import { advanceRound } from "../../../actions";
import SubmitButton from "../../../SubmitButton";
import ScanTab from "../ScanTab";
import CollectionPanel from "../CollectionPanel";
import { phoneScannerUrl } from "@/lib/phone-url";
import QRCode from "qrcode";
import CardCount from "../CardCount";
import { tasterLabel } from "@/lib/taster";
import TeamAnswers from "../TeamAnswers";
import { WineStory, TastingResults, QuizResults, Standings } from "../RoundResults";

export const dynamic = "force-dynamic";

const NOTICES: Record<string, string> = {
  stale: "The tasting has already moved on. You’re back at the current step.",
  setup: "Finish adding your wines and teams before continuing.",
  invalid: "An answer was not a valid option. Please check the team sheet and save again.",
  map: "That map square is not on this map. Use the printed column letter and row number, or leave it blank.",
  saved: "Team answers saved. Earlier rounds are unchanged.",
};

export default async function RunPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ wine?: string; step?: string; fix?: string; notice?: string; manual?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const event = await prisma.event.findUnique({ where: { id }, include: {
    wines: { orderBy: { position: "asc" }, include: { submissions: { include: { taster: true } } } },
    teams: { orderBy: { name: "asc" }, include: { guesses: true, mapGuesses: true } },
  } });
  if (!event) notFound();
  const active = event.wines.find((wine) => wine.position === event.activePosition) ?? event.wines[0];
  const liveStep = isRoundStep(event.runStep) ? event.runStep : "COLLECT";
  const selected = event.wines.find((wine) => wine.position === query.wine && (wine.id === active?.id || wine.stage === "REVEALED")) ?? active;
  const requested = isRoundStep(query.step) ? query.step : null;
  const step = selected?.stage === "REVEALED" && selected.id !== active?.id
    ? requested ?? "STANDINGS"
    : requested && ROUND_STEPS.indexOf(requested) <= ROUND_STEPS.indexOf(liveStep) ? requested : liveStep;
  const isLive = selected?.id === active?.id && step === liveStep;
  const stepIndex = ROUND_STEPS.indexOf(step);
  const lastViewIndex = selected?.id === active?.id ? ROUND_STEPS.indexOf(liveStep) : ROUND_STEPS.length - 1;
  const previousStep = stepIndex > 0 ? ROUND_STEPS[stepIndex - 1] : null;
  const nextViewStep = stepIndex < lastViewIndex ? ROUND_STEPS[stepIndex + 1] : null;
  const next = active ? nextRound(event.wines, active.position, liveStep) : null;
  const idSet = ID_SETS[event.idSet] ?? ID_SETS.house;
  const guests = event.teams.reduce((sum, team) => sum + team.memberCount, 0);
  const liveCategories = CATEGORIES.filter((category) => playable(event.wines, category));
  const hasMap = mapRoundReady(event.wines, event.mapMode);
  const categoryCount = liveCategories.length + (hasMap ? 1 : 0);
  const completeFlight = event.wines.length === event.wineCount
    && POSITIONS.slice(0, event.wineCount).every((position) => event.wines.some((wine) => wine.position === position));
  const ready = completeFlight && event.teams.length > 0 && categoryCount > 0 && (!mapEnabled(event.mapMode) || hasMap) && guests <= idSet.a.length * idSet.b.length;
  const url = (position: string, targetStep: string) => `/t/${id}/run?wine=${position}&step=${targetStep}`;
  const fixing = selected?.submissions.find((submission) => submission.id === query.fix);
  const counts = selected ? {
    cards: selected.submissions.length,
    reviewed: selected.submissions.filter((s) => s.status === "NEEDS_REVIEW").length,
    answers: event.teams.reduce((total, team) => total + liveCategories.filter((category) =>
      team.guesses.some((g) => g.wineId === selected.id && g.category === category)).length
      + (hasMap && parseCell(team.mapGuesses.find((g) => g.wineId === selected.id)?.cell, event.mapMode as "EUROPE" | "WORLD") ? 1 : 0), 0),
  } : null;

  const phoneUrl = step === "COLLECT" && selected ? await phoneScannerUrl(id, selected.position) : "";
  const demo = isDemoTasting(event);
  const qr = phoneUrl ? await QRCode.toDataURL(phoneUrl, { width: 180, margin: 3, errorCorrectionLevel: "M" }) : "";
  return <main className="page run-page">
    <header className="masthead">
      <div><div className="eyebrow"><Link href="/">Wine Flight</Link> · host controls</div>
        <h1>{event.name}</h1></div>
      <details className="host-options"><summary>More options</summary><div>
        <Link href={`/t/${id}?tab=setup`}>Edit tasting</Link>
        <Link href={`/t/${id}/present`} target="_blank">Show on a TV ↗</Link>
        <p className="small">Optional guest screen that follows the host.</p>
      </div></details>
    </header>

    {query.notice && NOTICES[query.notice] && <p className={`note ${query.notice === "saved" ? "note-olive" : ""}`} role="status">{NOTICES[query.notice]}</p>}
    {query.manual && <p className={`note ${query.manual === "saved" ? "note-olive" : ""}`} role="status">{
      query.manual === "saved" ? "Tasting card saved." : query.manual === "who" ? "Names are optional. You can save an unnamed card." : "That wine is missing from this tasting."}</p>}

    <details className="round-history"><summary>Previous wines &amp; steps</summary>    <nav className="flight-progress" aria-label="Wines in the flight">
      {POSITIONS.slice(0, event.wineCount).map((position) => {
        const wine = event.wines.find((w) => w.position === position);
        const accessible = wine && (wine.id === active?.id || wine.stage === "REVEALED");
        const content = <><span className="wine-token">{position}</span><span>{wine?.stage === "REVEALED" ? "Revealed" : wine?.id === active?.id ? "Current wine" : wine ? "To come" : "Not added"}</span></>;
        return accessible ? <Link key={position} href={wine.id === active?.id ? `/t/${id}/run` : url(position, "STANDINGS")}
          className="flight-stop" aria-current={selected?.position === position ? "step" : undefined}>{content}</Link>
          : <span key={position} className="flight-stop is-upcoming">{content}</span>;
      })}
    </nav></details>

    {!ready ? <section className="card setup-needed"><span className="label">Setup incomplete</span><h2>Finish setting up the tasting</h2>
      <ul className="readiness-list">
        <li>{completeFlight ? "✓" : "○"} Add wines A–{POSITIONS[event.wineCount - 1]} ({event.wines.length} of {event.wineCount} added).</li>
        <li>{event.teams.length ? "✓" : "○"} Set up your teams and how many people are on each.</li>
        <li>{liveCategories.length ? "✓" : "○"} Give every wine a distinct answer in a quiz category, or set up its map location.</li>
        {mapEnabled(event.mapMode) && <li>{hasMap ? "✓" : "○"} Confirm each region’s location in Wines for the map round, or change the map setting in Setup.</li>}
        {guests > idSet.a.length * idSet.b.length && <li>○ Choose a name set with enough unique names for {guests} guests.</li>}
      </ul>
      <div className="row"><Link className="btn btn-primary" href={`/t/${id}?tab=setup`}>Set up teams</Link><Link className="btn" href={`/t/${id}?tab=wines`}>Add or check wines</Link></div>
    </section> : selected && <>
      <div className="round-heading"><div><span className="label">Wine {selected.position} of {event.wineCount} · {selected.side === "RED" ? "red" : "white"}</span>
        <h2>{STEP_LABELS[step]}</h2></div>
        <div className="round-counts"><span><CardCount key={`${selected.id}-${counts!.cards}`} eventId={id} position={selected.position} initial={counts!.cards} expected={guests} /></span>{step !== "COLLECT" && <span>{counts!.answers}/{categoryCount * event.teams.length} team answers</span>}</div>
      </div>
      <nav className="round-steps" aria-label={`Steps for wine ${selected.position}`}>
        {ROUND_STEPS.map((target, i) => {
          const accessible = i <= lastViewIndex;
          return accessible ? <Link key={target} href={url(selected.position, target)} aria-current={step === target ? "step" : undefined}>
            <span>{i + 1}</span>{STEP_LABELS[target]}</Link> : <span className="step-locked" key={target}><span>{i + 1}</span>{STEP_LABELS[target]}</span>;
        })}
      </nav>
      {!isLive && <div className="review-banner"><span>Live page: Wine {active?.position} · {STEP_LABELS[liveStep]}</span><Link href={`/t/${id}/run`}>Return to live page →</Link></div>}

      <div className={`round-content round-${step.toLowerCase()}`}>
        {step === "COLLECT" && <>
          {demo && <p className="small demo-note">Demo · sample team answers are filled in. <a href="/sample-cards.html" target="_blank">Get the filled-in cards ↗</a></p>}
          <div className="pour-intro"><div><span className="wine-token">{selected.position}</span><h3>Pour wine {selected.position} and pass out the cards.</h3></div>
            <p className="lede">Everyone fills in their own card. Scan the cards on your phone. The count updates here. Keep the bottle covered.</p></div>
          {fixing ? <ScanTab key={`${selected.id}-${fixing.id}`} eventId={id} idSet={idSet} idSetKey={event.idSet} wineCount={event.wineCount}
            priceOnCard={event.priceOnCard} expected={guests} activePosition={selected.position} returnTo="run"
            fixing={{ ...fixing, position: selected.position, idA: fixing.taster.idA, idB: fixing.taster.idB }}
            wines={event.wines.map(wine => ({ position: wine.position, side: wine.side, name: wine.stage === "REVEALED" ? wine.name : "Bottle hidden", count: wine.submissions.length }))}
            recent={selected.submissions.map(card => ({ id: card.id, at: card.createdAt.toISOString(), position: selected.position, wine: "Bottle hidden",
              taster: tasterLabel(card.taster), status: card.status, note: card.reviewNote }))} />
            : <CollectionPanel key={selected.id} eventId={id} position={selected.position} phoneUrl={phoneUrl} qr={qr}
              initial={{ count: counts!.cards, expected: guests, reviewed: counts!.reviewed,
                cards: selected.submissions.map(card => ({ id: card.id, at: card.createdAt.toISOString(), position: selected.position, wine: "Bottle hidden",
                  taster: tasterLabel(card.taster), status: card.status, note: card.reviewNote })) }} />}

        </>}
        {step === "ANSWERS" && <TeamAnswers map={event.mapMode} eventId={id} wines={event.wines} wine={selected} teams={event.teams} canReveal={isLive} />}
        {step === "REVEAL" && <WineStory map={event.mapMode} wine={selected} />}
        {step === "TASTING" && <TastingResults wine={selected} />}
        {step === "QUIZ" && <QuizResults map={event.mapMode} eventId={id} allWines={event.wines} wine={selected} teams={event.teams} />}
        {step === "STANDINGS" && <Standings map={event.mapMode} allWines={event.wines} wines={revealedThrough(event.wines, selected.position)} teams={event.teams} />}
      </div>
      <footer className="round-footer sticky-round-footer">
        <div className="round-footer-back">{previousStep && <Link className="btn" href={url(selected.position, previousStep)} aria-label={`Previous page: ${STEP_LABELS[previousStep]}`}>← Previous page</Link>}
        {isLive && step !== "ANSWERS" && <div>{step === "COLLECT" ? <p className="small"><CardCount key={`${selected.id}-${counts!.cards}`} eventId={id} position={selected.position} initial={counts!.cards} expected={guests} remaining /></p>
          : step === "STANDINGS" && !next ? <><h3>Tasting complete</h3><p className="small">You can view each wine’s results above.</p></>
          : next?.position !== selected.position && <p className="small">{`Ready for wine ${next?.position}? Keep the next bottle covered.`}</p>}</div>}</div>
        {isLive && step !== "ANSWERS" && next && <form action={advanceRound}>
          <input type="hidden" name="eventId" value={id} /><input type="hidden" name="fromPosition" value={active.position} /><input type="hidden" name="fromStep" value={liveStep} />
          <SubmitButton pending="Moving on…">{next.position !== active.position ? `Pour wine ${next.position} →` : `${STEP_LABELS[next.step]} →`}</SubmitButton>
        </form>}
        {isLive && step !== "ANSWERS" && !next && <Link className="btn" href={`/t/${id}?tab=results`}>View the full results →</Link>}
        {!isLive && nextViewStep && <Link className="btn btn-primary" href={url(selected.position, nextViewStep)} aria-label={`Next page: ${STEP_LABELS[nextViewStep]}`}>Next page →</Link>}
        {!isLive && !nextViewStep && <Link className="btn" href={`/t/${id}/run`}>Return to live page →</Link>}
      </footer>
    </>}
  </main>;
}
