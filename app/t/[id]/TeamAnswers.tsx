import { saveRoundAnswers } from "../../actions";
import SubmitButton from "../../SubmitButton";
import RevealSubmit from "./RevealSubmit";
import { CATEGORIES, CATEGORY_META, optionOrder, OPTION_LABELS, optionFor, playable, whyNotPlayable, type QuizWine } from "@/lib/quiz";
import MapCellInput from "../../components/MapCellInput";
import GridMap from "../../components/GridMap";
import { mapMode, mapRoundReady, parseCell, MAPS } from "@/lib/map";
import type { QuizTeam } from "@/lib/team-results";

export default function TeamAnswers({ eventId, wines, wine, teams, canReveal, map: selectedMap = "OFF" }: {
  eventId: string; wines: QuizWine[]; wine: QuizWine; teams: QuizTeam[]; canReveal: boolean; map?: string;
}) {
  const mode = mapMode(selectedMap);
  const hasMap = mapRoundReady(wines, mode);
  const categoryCount = CATEGORIES.filter((category) => playable(wines, category)).length + (hasMap ? 1 : 0);
  const mapMissing = hasMap ? teams.filter((team) => !parseCell(team.mapGuesses?.find((guess) => guess.wineId === wine.id)?.cell, mode)).length : 0;
  const categories = CATEGORIES.filter((category) => playable(wines, category));
  const missing = teams.reduce((total, team) => total + categories.filter((category) =>
    !team.guesses.some((g) => g.wineId === wine.id && g.category === category)).length, 0);
  return <section className="stack" style={{ gap: "1.2rem" }}>
    <div><span className="label">Wine {wine.position} · enter the team sheets</span><h2>What did each team pick?</h2>
      <p className="lede">Copy the option numbers from this wine’s row on each team sheet. Saving this round leaves earlier answers in place.</p></div>
    {hasMap && <details className="card"><summary>{MAPS[mode].title} grid · no answer shown</summary>
      <GridMap mode={mode} /><p className="small">Copy the cell reference from each team’s map. Squares can repeat between wines.</p></details>}
    <form action={saveRoundAnswers} className="stack" style={{ gap: "1.2rem" }}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="fromPosition" value={wine.position} />
      <input type="hidden" name="fromStep" value="ANSWERS" />
      {teams.map((team) => <fieldset key={team.id} className="card team-answer-card">
        <legend>{team.name}<span className="small"> · {team.memberCount} people</span></legend>
        <div className="answer-entry-grid">{categories.map((category) => {
          const order = optionOrder(eventId, category, wines);
          const guess = team.guesses.find((g) => g.category === category && g.wineId === wine.id);
          const slot = order.findIndex((w) => w.id === guess?.choiceId);
          return <label key={category} className="field"><span className="label">{CATEGORY_META[category].title}</span>
            <select name={`t:${team.id}:${category}`} defaultValue={slot < 0 ? "" : slot}>
              <option value="">No answer</option>
              {order.map((option, i) => <option value={i} key={option.id}>{OPTION_LABELS[i]}: {optionFor(option, category)}</option>)}
            </select>
          </label>;
        })}</div>
        {hasMap && <div className="map-answer-field"><MapCellInput key={`${team.id}-${wine.id}`} mode={mode} name={`m:${team.id}`}
          initial={team.mapGuesses?.find((guess) => guess.wineId === wine.id)?.cell ?? ""} /></div>}
      </fieldset>)}
      {categories.length === 0 && !hasMap && <p className="note">There are no playable quiz categories yet. Add distinct facts for your wines before starting.</p>}
      <div className="small">{categoryCount * teams.length - missing - mapMissing} of {categoryCount * teams.length} answers saved for this wine. You can save incomplete answers and return later.</div>
      <div className="round-actions">
        <SubmitButton className="btn">Save answers</SubmitButton>
        {canReveal && <RevealSubmit position={wine.position} />}
      </div>
      {canReveal && <p className="small">Reveal when all teams have answered. Blank answers earn zero points.</p>}
    </form>
    {CATEGORIES.filter((c) => !categories.includes(c)).length > 0 && <details className="card">
      <summary>Categories left out of this flight</summary>
      {CATEGORIES.filter((c) => !categories.includes(c)).map((c) => <p className="small" key={c}>{CATEGORY_META[c].title}: {whyNotPlayable(wines, c)}.</p>)}
    </details>}
  </section>;
}
