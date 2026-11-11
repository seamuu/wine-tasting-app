import { saveTeamGuesses, renameTeam, deleteTeam } from "../../actions";
import {
  CATEGORIES, CATEGORY_META, OPTION_LABELS, optionFor, optionOrder, playable, whyNotPlayable,
  type Category, type QuizWine,
} from "@/lib/quiz";

type Guess = { category: string; wineId: string; choiceId: string };
type Team = { id: string; name: string; guesses: Guess[] };

const short = (s: string, n = 46) => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…");

/**
 * The team round, typed in from the paper sheets.
 *
 * Deliberately laid out like the sheet itself — wines down, categories across —
 * so the host can copy it over without having to translate between two shapes
 * at the end of a long evening.
 */
export default function QuizTab({ event }: {
  event: { id: string; wines: QuizWine[]; teams: Team[] };
}) {
  const wines = event.wines;
  const live = CATEGORIES.filter((c) => playable(wines, c));
  const dropped = CATEGORIES.filter((c) => !playable(wines, c))
    .map((c) => ({ c, why: whyNotPlayable(wines, c)! }));

  const orders = new Map<Category, QuizWine[]>(
    live.map((c) => [c, optionOrder(event.id, c, wines)]));

  const scoreOf = (team: Team) => {
    let right = 0, of = 0;
    for (const c of live) for (const w of wines) {
      of += 1;
      const g = team.guesses.find((x) => x.category === c && x.wineId === w.id);
      if (g?.choiceId === w.id) right += 1;
    }
    return { right, of };
  };

  const ranked = [...event.teams].sort((a, b) => scoreOf(b).right - scoreOf(a).right);

  return (
    <div className="stack" style={{ gap: "2.2rem" }}>
      <section>
        <div className="section-title">The matching round</div>
        <p className="lede" style={{ marginBottom: "1rem" }}>
          One sheet per team for the whole night. Every answer is used once, so it&rsquo;s a puzzle
          the table has to solve together. Type the sheets in here when they&rsquo;re handed back —
          there are only a couple, so they aren&rsquo;t scanned.
        </p>
        <div className="row">
          <a className="btn" href={`/t/${event.id}/quiz?teams=${Math.max(2, event.teams.length)}`}
             target="_blank" rel="noreferrer">Print the team sheets ↗</a>
          <span className="small">
            {live.length} round{live.length === 1 ? "" : "s"} in play
            {dropped.length > 0 && ` · ${dropped.map(({ c, why }) => `${CATEGORY_META[c].title.toLowerCase()} dropped (${why})`).join(", ")}`}
          </span>
        </div>
      </section>

      {wines.length < 2 ? (
        <p className="empty">Add at least two wines and the matching rounds build themselves.</p>
      ) : live.length === 0 ? (
        <p className="note">
          No round can run yet. Each one needs every wine to have its own distinct answer — add the
          wines from their Vinmonopolet links so region, grapes and the tasting note come across.
        </p>
      ) : (
        <>
          {ranked.map((team) => {
            const s = scoreOf(team);
            return (
              <section key={team.id} className="card">
                <div className="spread" style={{ marginBottom: ".9rem" }}>
                  <form action={renameTeam} className="row" style={{ gap: ".4rem" }}>
                    <input type="hidden" name="teamId" value={team.id} />
                    <input type="text" name="name" defaultValue={team.name} style={{ width: "12rem" }} />
                    <button className="btn btn-sm" type="submit">Rename</button>
                  </form>
                  <div className="row">
                    <span className="pill pill-olive tabular">{s.right} / {s.of}</span>
                    <form action={deleteTeam}>
                      <input type="hidden" name="teamId" value={team.id} />
                      <button className="btn btn-sm btn-quiet" type="submit">Remove</button>
                    </form>
                  </div>
                </div>

                <form action={saveTeamGuesses}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="teamName" value={team.name} />
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ borderCollapse: "collapse", width: "100%", fontSize: ".85rem" }}>
                      <thead>
                        <tr style={{ textAlign: "left", borderBottom: "1px solid var(--rule)" }}>
                          <th style={{ padding: ".3rem .5rem .3rem 0" }}>Glass</th>
                          {live.map((c) => (
                            <th key={c} style={{ padding: ".3rem .5rem", fontWeight: 600 }}>
                              {CATEGORY_META[c].title}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {wines.map((w) => (
                          <tr key={w.id} style={{ borderBottom: "1px solid var(--paper-3)" }}>
                            <td style={{ padding: ".35rem .5rem .35rem 0", fontWeight: 600, whiteSpace: "nowrap" }}>
                              Wine {w.position}
                            </td>
                            {live.map((c) => {
                              const order = orders.get(c)!;
                              const g = team.guesses.find((x) => x.category === c && x.wineId === w.id);
                              const slot = g ? order.findIndex((o) => o.id === g.choiceId) : -1;
                              const right = g?.choiceId === w.id;
                              return (
                                <td key={c} style={{ padding: ".25rem .5rem" }}>
                                  <select name={`g:${c}:${w.id}`} defaultValue={slot >= 0 ? String(slot) : ""}
                                          style={{ minWidth: "9rem",
                                                   borderColor: g ? (right ? "var(--olive)" : "var(--claret)") : undefined }}>
                                    <option value="">—</option>
                                    {order.map((o, i) => (
                                      <option key={o.id} value={i}>
                                        {OPTION_LABELS[i]} — {short(optionFor(o, c) ?? "")}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="row" style={{ marginTop: ".9rem" }}>
                    <button className="btn btn-primary btn-sm" type="submit">Save {team.name}</button>
                    <span className="small">Green means right, claret means wrong — so don&rsquo;t show the room your screen.</span>
                  </div>
                </form>
              </section>
            );
          })}

          <section className="card">
            <div className="section-title">Add a team</div>
            <form action={saveTeamGuesses} className="row">
              <input type="hidden" name="eventId" value={event.id} />
              <input type="text" name="teamName" placeholder="Team 3" style={{ maxWidth: "14rem" }} />
              <button className="btn" type="submit">Create</button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
