import Link from "next/link";
import { updateEvent, saveTeam, deleteTeam, resetResults } from "../../actions";
import SubmitButton from "../../SubmitButton";
import { ID_SETS, POSITIONS, printMath } from "@/lib/card";
import { MAPS, mapMode, mapEnabled, mapRoundReady, pointCell, outsideEurope } from "@/lib/map";
import { CATEGORIES, CATEGORY_META, playable, whyNotPlayable, type QuizWine } from "@/lib/quiz";
import { PRINT_PACKS } from "@/lib/print-packs";
import PrintDownloads from "./PrintDownloads";

type EventRow = {
  id: string; name: string; idSet: string; wineCount: number;
  guestCount: number | null; priceOnCard: boolean; mapMode: string;
  wines: (QuizWine & { stage: string; side: string; submissions: unknown[] })[];
  teams: { id: string; name: string; memberCount: number; guesses?: unknown[]; mapGuesses?: unknown[] }[];
};

export default function SetupTab({ event, step = "tasting" }: { event: EventRow; step?: string }) {
  const mode = mapMode(event.mapMode);
  const mapReady = mapRoundReady(event.wines, mode);
  const mapLocked = event.wines.some((wine) => wine.stage === "LOCKED" || wine.stage === "REVEALED") || event.teams.some((team) => team.guesses?.length || team.mapGuesses?.length);
  const mapTargets = mapEnabled(mode) ? event.wines.filter((wine) => pointCell(wine, mode)).length : 0;
  const outside = mode === "EUROPE" ? event.wines.filter((wine) => outsideEurope(wine.country)) : [];
  const idSet = ID_SETS[event.idSet] ?? ID_SETS.house;
  const capacity = idSet.a.length * idSet.b.length;
  const guests = event.teams.reduce((n, team) => n + team.memberCount, 0);
  const { cards, sheets } = printMath(guests, event.wineCount);
  const printUrl = `/card-v2.html?ids=${event.idSet}&wines=${event.wineCount}&price=${event.priceOnCard ? 1 : 0}`;
  const ready = guests > 0 && guests <= capacity && event.wines.length === event.wineCount && (!mapEnabled(mode) || mapReady);
  const rounds = CATEGORIES.filter((category) => playable(event.wines, category));
  const started = event.wines.some((wine) => wine.stage !== "UPCOMING" || wine.submissions.length > 0);

  return (
    <div className="setup-flow">
      <div className="stack" style={{ gap: "1rem" }}>
        <details className="card setup-step" name="tasting-setup" open={step === "tasting"} id="setup-tasting">
          <summary>1 · The tasting</summary>
          <form action={updateEvent} className="stack" style={{ gap: "1rem" }}>
            <input type="hidden" name="eventId" value={event.id} />
            <input type="hidden" name="nextSetupStep" value="teams" />
            <label className="field">
              <span className="label">Tasting name</span>
              <input name="name" type="text" defaultValue={event.name} required />
            </label>
            <label className="field">
              <span className="label">How many wines?</span>
              <select name="wineCount" defaultValue={event.wineCount} disabled={started}>
                {[2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n} wines · A–{POSITIONS[n - 1]}</option>)}
              </select>
            </label>
            <label className="field"><span className="label">The map round</span>
              <select name="mapMode" defaultValue={mode} disabled={mapLocked}>
                <option value="EUROPE">Europe · easier to place the region</option>
                <option value="WORLD">World · wines from any country</option>
                <option value="OFF">No map round</option>
              </select>
              <span className="small">Optional: teams locate each wine’s region on a map.</span>
            </label>
            {outside.length > 0 && <p className="note">Wine {outside.map((wine) => wine.position).join(", ")} {outside.length === 1 ? "is" : "are"} from outside Europe. Choose European wines or switch to World. The wines you added are still saved.</p>}
            {started && <p className="small">The wines and card layout cannot be changed after card collection starts.</p>}
            <div><SubmitButton>Save &amp; continue →</SubmitButton></div>
          </form>
        </details>

        <details className="card setup-step" name="tasting-setup" open={step === "teams"} id="setup-teams">
          <summary>2 · Your teams</summary>
          <p className="lede">Team sizes tell us how many cards to collect for each wine.</p>
          <div className="stack" style={{ gap: "1rem", marginTop: "1rem" }}>
            {event.teams.map((team) => (
              <details className="team-setup" key={team.id}><summary>{team.name} · {team.memberCount} {team.memberCount === 1 ? "person" : "people"}</summary>
                <form action={saveTeam} className="team-form">
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="teamId" value={team.id} />
                  <label className="field"><span className="label">Team name</span>
                    <input type="text" name="name" defaultValue={team.name} required maxLength={60} />
                  </label>
                  <label className="field"><span className="label">People</span>
                    <input type="number" name="memberCount" defaultValue={team.memberCount} required min={1} max={100} />
                  </label>
                  <SubmitButton className="btn btn-sm">Save</SubmitButton>
                </form>
                <details className="small"><summary>Remove team</summary>
                  <p>This also removes this team’s quiz answers.</p>
                  <form action={deleteTeam}><input type="hidden" name="teamId" value={team.id} />
                    <SubmitButton className="btn btn-sm btn-quiet" pending="Removing…">Remove {team.name}</SubmitButton>
                  </form>
                </details>
              </details>
            ))}
            <form key={event.teams.length} action={saveTeam} className="team-form">
              <input type="hidden" name="eventId" value={event.id} />
              <label className="field"><span className="label">New team</span>
                <input type="text" name="name" placeholder={`Team ${event.teams.length + 1}`} required maxLength={60} />
              </label>
              <label className="field"><span className="label">People</span>
                <input type="number" name="memberCount" placeholder="5" required min={1} max={100} />
              </label>
              <SubmitButton className="btn btn-primary btn-sm">Add team</SubmitButton>
            </form>
          </div>
          <p className="small"><b>{event.teams.length} teams · {guests} people</b></p>
          {event.guestCount != null && guests !== event.guestCount && <p className="note">This tasting previously had {event.guestCount} guests. Check and save each team’s size so the card count matches your room.</p>}
          {guests > capacity && <p className="note">This card has {capacity} unique names for {guests} people. Choose a larger name set below before printing.</p>}
          <Link className="btn" href={`/t/${event.id}?tab=wines`}>Next: set up wines →</Link>
        </details>

        <details className="card" id="reset-results">
          <summary>Clear results and start again</summary>
          <p className="small">Deletes all tasting cards and team answers, including map guesses, for this tasting. Resets all wines to unrevealed and returns to wine A. Wines, teams, names and settings are kept.</p>
          <form action={resetResults} className="stack" style={{ gap: "1rem", marginTop: "1rem" }}>
            <input type="hidden" name="eventId" value={event.id} />
            <label className="row"><input type="checkbox" name="confirmReset" value="yes" required />I understand that these results cannot be recovered.</label>
            <div><SubmitButton className="btn btn-quiet" pending="Clearing results…">Clear results</SubmitButton></div>
          </form>
        </details>

        <details className="card">
          <summary>Card settings</summary>
          <p className="small">Set these before printing. Changing the names, wine count or price layout means printing a new pack.</p>
          <form action={updateEvent} className="stack" style={{ gap: "1rem", marginTop: "1rem" }}>
            <input type="hidden" name="eventId" value={event.id} />
            <label className="field"><span className="label">Names on the cards</span>
              <select name="idSet" defaultValue={event.idSet} disabled={started}>
                {Object.entries(ID_SETS).map(([key, value]) => <option key={key} value={key}>{value.label} · {value.a.length * value.b.length} people</option>)}
              </select>
            </label>
            <label className="field"><span className="label">Individual price guess</span>
              <select name="priceOnCard" defaultValue={event.priceOnCard ? "1" : "0"} disabled={started}>
                <option value="0">Team quiz only (recommended)</option>
                <option value="1">Also on individual cards</option>
              </select>
            </label>
            <div><SubmitButton>Save card settings</SubmitButton></div>
          </form>
          <p className="small">Names are optional. A different colour-and-animal pair for each person lets us link their cards across wines.</p>
        </details>
      </div>

      <div className="stack" style={{ gap: "1rem" }}>
        <details className="card setup-step" name="tasting-setup" id="setup-wines">
          <summary>3 · Wines · {event.wines.length}/{event.wineCount} added</summary>
          <Link className="btn btn-primary" href={`/t/${event.id}?tab=wines`}>Set up wines →</Link>
        </details>
        <details className="card setup-step" name="tasting-setup" open={step === "print"} id="setup-print">
          <summary>4 · Print</summary>
          {PRINT_PACKS[event.id] ? <PrintDownloads eventId={event.id} /> : <>

          {guests ? <>
            <p className="serif stat-number">{cards} <span>tasting cards</span></p>
            <p className="small">{guests} people × {event.wineCount} wines = {sheets} A4 sheets, double-sided, two cards to a sheet.</p>
          </> : <p className="small">Add teams to see how many cards to print.</p>}
          <div className="stack" style={{ gap: ".6rem", marginTop: "1rem" }}>
            <a className="btn" href={`${printUrl}&print=a4`} target="_blank" rel="noreferrer">Print tasting cards ↗</a>
            <a className="btn" href={`/names.html?ids=${event.idSet}`} target="_blank" rel="noreferrer">Print name tags ↗</a>
            <a className="btn" href={`/sample-cards.html?ids=${event.idSet}&wines=${event.wineCount}&price=${event.priceOnCard ? 1 : 0}&sides=${POSITIONS.slice(0, event.wineCount).map((position) => event.wines.find((wine) => wine.position === position)?.side === "RED" ? "R" : "W").join("")}`} target="_blank" rel="noreferrer">Filled-in cards for a scan test ↗</a>
            <a className="btn" href={`/t/${event.id}/quiz`} target="_blank" rel="noreferrer">Print team quiz{mapEnabled(mode) ? " + maps" : " sheets"} ↗</a>
            {mapEnabled(mode) && <a className="btn" href={`/t/${event.id}/quiz?maps=only`} target="_blank" rel="noreferrer">Preview the gridded map ↗</a>}
          </div>
          <p className="small">Print one test sheet first and scan it. Use pens and flip double-sided cards on the short edge.</p>
          <details className="setup-checklist"><summary>Check the setup</summary>
          <ul className="readiness-list">
            <li>{event.teams.length ? "✓" : "○"} Teams and sizes set</li>
            <li>{event.wines.length === event.wineCount ? "✓" : "○"} {event.wines.length} of {event.wineCount} wines added</li>
            <li>{rounds.length ? "✓" : "○"} {rounds.length} quiz categories ready</li>
            {mapEnabled(mode) && <li>{mapReady ? "✓" : "○"} {MAPS[mode].title} map: {mapTargets} of {event.wineCount} region locations set in Wines</li>}
          </ul>
          {CATEGORIES.filter((c) => !rounds.includes(c)).map((c) => (
            <p key={c} className="small">{CATEGORY_META[c].title}: {whyNotPlayable(event.wines, c)}.</p>
          ))}
          </details>
          <Link className="btn btn-primary" href={`/t/${event.id}/run`}>{ready ? "Start the quiz →" : "Check what’s missing →"}</Link>
          </>}
        </details>
      </div>
    </div>
  );
}
