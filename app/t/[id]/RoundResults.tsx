import { optionFor, optionOrder, OPTION_LABELS, type QuizWine } from "@/lib/quiz";
import { teamStandings, SCORE_TITLES, type QuizTeam } from "@/lib/team-results";
import { mean, consensus, ratingHistogram, wheelData, type WineRow } from "@/lib/tally";
import { splitFlavour } from "@/lib/card";
import { Histogram, StructureStrips } from "./Charts";
import GridMap from "../../components/GridMap";
import FranceWineMap from "../../components/FranceWineMap";
import { mapMode, mapRoundReady, mapEnabled, pointCell, parseCell, mapScore, MAPS } from "@/lib/map";
import Wheel, { WheelLegend } from "./Wheel";
import { wineReveal } from "@/lib/wine-reveals";

export type StoryWine = WineRow & QuizWine & {
  producer: string | null; vintage: number | null; priceNok: unknown;
  alcohol: unknown; sugarGl: unknown; acidGl: unknown;
  colour: string | null; smell: string | null; taste: string | null;
  bodyRaw: number | null; acidRaw: number | null; tanninRaw: number | null; sweetRaw: number | null;
  foodPairing: string[]; grapeNotes: unknown; storage: string | null; sourceUrl: string | null; sourceRef?: string | null;
};
const number = (value: unknown) => value == null ? null : Number(String(value));
const rating = (wine: WineRow) => mean(wine.submissions.map((s) => s.rating).filter((n): n is number => n != null));

export function CoveredWine({ position, children }: { position: string; children?: React.ReactNode }) {
  return <div className="covered-wine"><div className="deck-letter">{position}</div>
    <h2>Wine not revealed yet</h2>
    <p className="lede">{children ?? "Fill in your tasting card and team answers. The host will reveal the wine."}</p>
  </div>;
}

export function WineStory({ wine, map: selectedMap = "OFF", preview = false }: { wine: StoryWine; map?: string; preview?: boolean }) {
  if (!preview && wine.stage !== "REVEALED") return <CoveredWine position={wine.position} />;
  const reveal = wineReveal(wine.sourceRef, wine.sourceUrl);
  const mode = mapMode(selectedMap);
  const mapCell = mapEnabled(mode) ? pointCell(wine, mode) : null;
  const grapeNotes = Array.isArray(wine.grapeNotes) ? wine.grapeNotes.filter((g): g is { name: string; about: string; share: string } =>
    g != null && typeof g === "object" && typeof g.name === "string" && typeof g.about === "string" && typeof g.share === "string") : [];
  const scales = [
    { label: "Body", value: wine.bodyRaw }, { label: "Acidity", value: wine.acidRaw },
    { label: "Tannin", value: wine.tanninRaw }, { label: "Sweetness", value: wine.sweetRaw },
  ].filter((scale) => scale.value != null);
  return <div className={`result-layout wine-story ${reveal?.location ? "has-origin-map" : ""}`}>
    <header className="stack wine-story-heading" style={{ gap: "1rem" }}>
      <div><span className="label">Wine {wine.position} · the reveal</span>
        <h2 className="result-title">{wine.name}</h2>
        <p className="lede">{[wine.producer, wine.vintage, wine.appellation ?? wine.region, wine.country].filter(Boolean).join(" · ")}</p>
      </div>
      <div className="row">
        {number(wine.priceNok) != null && <span className="fact-chip">kr {number(wine.priceNok)!.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
        {reveal && <span className="fact-chip">{reveal.volumeCl} cl</span>}
        {number(wine.alcohol) != null && <span className="fact-chip">{number(wine.alcohol)}% alcohol</span>}
        {wine.grapes && <span className="fact-chip">{wine.grapes}</span>}
      </div>
    </header>
    {reveal?.location && <FranceWineMap location={reveal.location} position={wine.position} />}
    <section className="stack wine-story-notes" style={{ gap: "1rem" }}>
      {reveal && <>
        <section className="reveal-summary"><div className="label">{reveal.style}</div><p className="lede">{reveal.summary}</p>
          <div className="row" aria-label="Flavours and texture to compare">{reveal.lookFor.map(note => <span className="pill" key={note}>{note}</span>)}</div>
        </section>
        <div className="reveal-highlights">{reveal.highlights.map(highlight => <section key={highlight.title}>
          <h3>{highlight.title}</h3><p>{highlight.text}</p>
        </section>)}</div>
        <section className="reveal-question"><div className="label">Have another sip</div><p>{reveal.question}</p></section>
      </>}
      {(wine.smell || wine.taste || wine.tastingNote) && <details className="quote-panel">
        <summary>Vinmonopolet’s tasting note · Norwegian</summary>
        {wine.smell && <p><span className="label">On the nose</span><br />{wine.smell}</p>}
        {wine.taste && <p><span className="label">On the palate</span><br />{wine.taste}</p>}
        {!wine.smell && !wine.taste && <p>{wine.tastingNote}</p>}
      </details>}
      {grapeNotes.some(g => g.about) && <details><summary>About the grapes · Vinmonopolet</summary>{grapeNotes.filter((g) => g.about).map((grape) => <div className="grape-story" key={grape.name}>
        <h3>{grape.share}</h3><p className="lede">{grape.about}</p>
      </div>)}</details>}
      {!wine.grapes && !wine.tastingNote && <p className="small">The host can add grapes and tasting notes in Wines before the next quiz.</p>}
    </section>
    <aside className="stack wine-story-facts" style={{ gap: "1rem" }}>
      {scales.length > 0 && <section className="card">
        <div className="section-title">Vinmonopolet’s sensory ratings</div>
        <div className="stack" style={{ gap: ".8rem" }}>{scales.map((scale) => <div key={scale.label}>
          <div className="spread small"><span>{scale.label}</span><b>{scale.value}/12</b></div>
          <div className="score-track"><span style={{ width: `${scale.value! / 12 * 100}%` }} /></div>
        </div>)}</div>
        <p className="small">Structure describes how the wine feels. Aroma describes what it smells and tastes of.</p>
      </section>}
      {wine.foodPairing.length > 0 && <section className="card">
        <div className="section-title">Try it with</div>
        <div className="row">{wine.foodPairing.map((food) => <span className="pill" key={food}>{food}</span>)}</div>
      </section>}
      {(wine.sugarGl != null || wine.acidGl != null || wine.storage) && <section className="card">
        <div className="section-title">Bottle details</div>
        {wine.sugarGl != null && <p className="small">Sugar: {String(wine.sugarGl)} g/L</p>}
        {wine.acidGl != null && <p className="small">Acid: {String(wine.acidGl)} g/L</p>}
        {wine.storage && <p className="small">{wine.storage}</p>}
      </section>}
      {!reveal?.location && mapEnabled(mode) && mapCell && <section className="card"><div className="section-title">Region · {mapCell}</div>
        <GridMap mode={mode} selectedCell={mapCell} point={wine} labels />
        <p className="small">{[wine.appellation ?? wine.region, wine.country].filter(Boolean).join(", ")} · {MAPS[mode].title} grid</p>
      </section>}
      {reveal && <a className="small" href={reveal.website.url} target="_blank" rel="noreferrer">{reveal.website.title} ↗</a>}
      {wine.sourceUrl && <a className="small" href={wine.sourceUrl} target="_blank" rel="noreferrer">Bottle details from Vinmonopolet ↗</a>}
      {reveal && reveal.sources.length > 0 && <details className="reveal-sources"><summary>Story sources</summary>
        <ul>{reveal.sources.map(source => <li key={source.url}><a className="small" href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></li>)}</ul>
      </details>}
    </aside>
  </div>;
}

export function TastingResults({ wine }: { wine: WineRow }) {
  if (wine.stage !== "REVEALED") return <CoveredWine position={wine.position} />;
  const average = rating(wine);
  const ratings = wine.submissions.filter((s) => s.rating != null);
  const top = consensus(wine.submissions, 6);
  return <div className="stack" style={{ gap: "1.5rem" }}>
    <div className="spread"><div><span className="label">Wine {wine.position} · the room</span><h2>What did we make of it?</h2></div>
      <span className="pill">{wine.submissions.length} cards collected</span></div>
    {wine.submissions.length === 0 ? <p className="empty">No tasting cards for this wine yet. The host can still add them.</p> : <div className="result-layout">
      <section className="card wheel-panel"><Wheel slices={wheelData(wine.submissions, wine.side, wine.keyFlavours)} tasters={wine.submissions.length}
        headline={wine.position} sub="Everyone’s aromas" /><WheelLegend hasKey={wine.keyFlavours.length > 0} /></section>
      <div className="stack" style={{ gap: "1rem" }}>
        <section className="card"><div className="section-title">Did we like it?</div>
          <p className="serif stat-number">{average == null ? "Not set" : average.toFixed(1)} <span>/ 10</span></p>
          <p className="small">{ratings.length} ratings · personal taste, no right answer</p>
          <div style={{ height: 135 }}><Histogram bins={ratingHistogram(wine.submissions)} average={null} /></div>
        </section>
        <section className="card"><div className="section-title">How it felt</div><StructureStrips wine={wine} />
          <p className="small">Average: everyone’s score. ✓ Ref: the wine’s reference value. Both use a 1–5 scale.</p>
        </section>
        <section className="card"><div className="section-title">Most mentioned</div><div className="row">
          {top.length ? top.map(([flavour, count]) => <span className="pill" key={flavour}>{splitFlavour(flavour).option} · {count}</span>) : <span className="small">No aromas marked.</span>}
        </div></section>
      </div>
    </div>}
  </div>;
}

export function QuizResults({ eventId, allWines, wine, teams, map: selectedMap = "OFF" }: {
  eventId: string; allWines: QuizWine[]; wine: QuizWine & { stage: string }; teams: QuizTeam[]; map?: string;
}) {
  if (wine.stage !== "REVEALED") return <CoveredWine position={wine.position} />;
  const mode = mapMode(selectedMap);
  const hasMap = mapRoundReady(allWines, mode);
  const target = hasMap ? pointCell(wine, mode) : null;
  const { categories, rows } = teamStandings(allWines, [wine], teams, mode);
  return <div className="stack" style={{ gap: "1.5rem" }}>
    <div><span className="label">Wine {wine.position} · quiz results</span><h2>Correct answers</h2>
      <p className="lede">Each correct answer earns 1 point.{hasMap && " Map: 1 for the right square, ½ for a neighbour."} A missing answer earns no points.</p></div>
    <div className={`quiz-result-layout ${hasMap ? "has-map" : ""}`}><div className="quiz-result-scores stack" style={{ gap: "1.2rem" }}>
    <div className="answer-reveal-grid">{categories.map((category) => {
      if (category === "MAP") return <section className="card" key={category}><div className="label">Map square</div><span className="answer-number">{target}</span><p>{MAPS[mode as "EUROPE" | "WORLD"].title} · {wine.appellation ?? wine.region ?? wine.country}</p></section>;
      const slot = optionOrder(eventId, category, allWines).findIndex((w) => w.id === wine.id);
      return <section className="card" key={category}><div className="label">{SCORE_TITLES[category]}</div>
        <span className="actual-answer" title={`Quiz sheet option ${OPTION_LABELS[slot]}`}>{optionFor(wine, category)}</span></section>;
    })}</div>
    {categories.length === 0 && <p className="note">This flight has no playable quiz categories yet. Add distinct wine facts in Wines.</p>}
    <div className="team-score-list">{rows.map(row => <div key={row.team.id}><strong>{row.team.name}</strong><span>{row.right} of {row.of} points</span></div>)}</div>
    {teams.length === 0 ? <p className="empty">Add teams in Setup to keep score.</p> : <details className="quiz-answer-detail"><summary>See each team’s answers</summary><div className="table-scroll"><table className="results-table">
      <thead><tr><th>Team</th>{categories.map((c) => <th key={c}>{SCORE_TITLES[c]}</th>)}<th>Points</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.team.id}><th>{row.team.name}</th>{categories.map((category) => {
        if (category === "MAP" && hasMap) {
          const guess = row.team.mapGuesses?.find((g) => g.wineId === wine.id);
          const cell = parseCell(guess?.cell, mode)?.cell;
          const points = mapScore(cell, target, mode);
          return <td key={category}><span className={points === 1 ? "answer-correct" : points === .5 ? "answer-near" : "answer-missed"}>
            {cell ? `${cell} ${points === 1 ? "✓" : points === .5 ? "½" : "✕"}` : "No answer"}</span></td>;
        }
        if (category === "MAP") return <td key={category}>No answer</td>;
        const guess = row.team.guesses.find((g) => g.category === category && g.wineId === wine.id);
        const picked = allWines.find(option => option.id === guess?.choiceId);
        return <td key={category}><span className={guess?.choiceId === wine.id ? "answer-correct" : "answer-missed"}>
          {!picked ? "No answer" : `${optionFor(picked, category)} ${guess?.choiceId === wine.id ? "✓" : "✕"}`}</span></td>;
      })}<td className="points-cell">{row.right} / {row.of}</td></tr>)}</tbody>
    </table></div></details>}
    </div>
    {hasMap && <section className="card map-reveal-panel"><div className="section-title">The region, and your guesses · {target}</div>
      <GridMap mode={mode} selectedCell={target} point={wine} reveal labels markers={teams.flatMap((team, index) => {
        const cell = parseCell(team.mapGuesses?.find((guess) => guess.wineId === wine.id)?.cell, mode)?.cell;
        return cell ? [{ cell, label: String(index + 1), title: team.name }] : [];
      })} />
      <div className="row map-team-legend">{teams.map((team, index) => <span className="pill" key={team.id}>{index + 1} · {team.name}</span>)}</div>
      <p className="small">Blue square: 1 point. Pale blue neighbours, including diagonals: ½ point. Numbered pins show each team’s guess; the cross marks the host’s reference point.</p>
    </section>}
    </div>
  </div>;
}

export function Standings({ allWines, wines, teams, map: selectedMap = "OFF" }: {
  allWines: QuizWine[]; wines: (WineRow & QuizWine)[]; teams: QuizTeam[]; map?: string;
}) {
  const { rows, categories, specialists } = teamStandings(allWines, wines, teams, selectedMap);
  const comparison = wines.map((wine) => ({ wine, average: rating(wine) }));
  const rated = comparison.filter((entry) => entry.average != null);
  const favourite = rated.length ? Math.max(...rated.map((entry) => entry.average!)) : null;
  return <div className="stack" style={{ gap: "1.6rem" }}>
    <div><span className="label">{wines.length} {wines.length === 1 ? "wine" : "wines"} revealed</span><h2>Team standings</h2>
      <p className="lede">Team scores so far.</p></div>
    {!wines.length ? <p className="empty">The standings begin after the first reveal.</p> : <>
      <div className="table-scroll"><table className="results-table standings-table">
        <caption className="sr-only">Team standings through wine {wines.at(-1)?.position}</caption>
        <thead><tr><th>Place</th><th>Team</th><th>Points</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.team.id} className={row.rank === 1 && row.right > 0 ? "leading-team" : ""}>
          <td>{row.rank}</td><th>{row.team.name}<span className="small team-size">{row.team.memberCount} people</span></th>
          <td className="points-cell">{row.right}<span className="small"> / {row.of}</span></td>
        </tr>)}</tbody>
      </table></div>
      {rows.some((row) => row.answered < row.of) && <p className="small">* Some team answers are missing. The host can enter or correct them in that wine’s Team answers step.</p>}
      <details className="standings-breakdown"><summary>Points by wine &amp; topic</summary>
      {rows.map(row => <div className="score-breakdown" key={row.team.id}><h3>{row.team.name}</h3><p className="small">Average: {row.average.toFixed(1)} of {categories.length} points per wine.</p>
        <div className="row">{row.perWine.map(score => <span className="pill" key={score.wineId}>Wine {score.position}: {score.right}/{score.of}</span>)}</div></div>)}
      {specialists.length > 0 && <div className="specialist-grid">{specialists.map((specialist) => <section className="card" key={specialist.category}>
        <div className="label">Best on {SCORE_TITLES[specialist.category].toLowerCase()}</div>
        <h3 style={{ marginTop: ".5rem" }}>{specialist.teams.join(" & ")}</h3>
        <p className="small">{specialist.right} of {specialist.of} {specialist.category === "MAP" ? "map points" : "correct"}{specialist.teams.length > 1 ? " · tied" : ""}</p>
      </section>)}</div>}
      </details>
      <details><summary>Compare wines</summary>
        <div className="comparison-grid">{comparison.map(({ wine, average }) => <section className="card" key={wine.id}>
          <div className="spread"><span className="wine-token">{wine.position}</span>{average != null && average === favourite && <span className="pill pill-olive">Top-rated wine{rated.filter((e) => e.average === favourite).length > 1 ? " · tied" : ""}</span>}</div>
          <h3 style={{ marginTop: ".8rem" }}>{wine.name}</h3>
          <p className="small">{[wine.appellation ?? wine.region, wine.grapes].filter(Boolean).join(" · ")}</p>
          <div className="spread"><span className="serif stat-number">{average == null ? "Not set" : average.toFixed(1)}<span> / 10</span></span>
            {wine.priceNok != null && <span className="small">kr {number(wine.priceNok)?.toFixed(0)}</span>}</div>
          <div className="score-track"><span style={{ width: `${(average ?? 0) * 10}%` }} /></div>
          <p className="small">{wine.submissions.filter((s) => s.rating != null).length} ratings</p>
        </section>)}</div>
      </details>
      <p className="small">Every team can earn the same {categories.length} points per wine, regardless of team size. Ratings and aroma preferences do not add quiz points.</p>
    </>}
  </div>;
}
