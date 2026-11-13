import { updateWine, deleteWine, refreshWine } from "../../actions";
import { PRICE_BUCKETS, POSITIONS } from "@/lib/card";
import { categoriesFor, TIERS, TIER_BLURB } from "@/lib/flavours";
import AddWine from "./AddWine";
import SubmitButton from "../../SubmitButton";
import MapTarget from "./MapTarget";
import { mapMode, mapEnabled, pointCell, outsideEurope } from "@/lib/map";
import { CATEGORIES, CATEGORY_META, playable, whyNotPlayable, type QuizWine } from "@/lib/quiz";

type Wine = {
  id: string; position: string; side: string; stage: string;
  mapLatitude: number | null; mapLongitude: number | null;
  name: string; producer: string | null; vintage: number | null;
  country: string | null; region: string | null; appellation: string | null; grapes: string | null;
  tastingNote: string | null; sourceUrl: string | null; sourceRef: string | null;
  teaser: string | null;
  priceNok: unknown; alcohol: unknown; sugarGl: unknown; acidGl: unknown;
  priceBucket: number | null;
  keyBody: number | null; keyAcidity: number | null; keyTannin: number | null;
  keySweetness: number | null; keyAlcohol: number | null;
  keyFlavours: string[];
  submissions: unknown[];
};

const dec = (v: unknown) => (v == null ? null : String(v));

const STAGES: Record<string, { pill: string }> = {
  UPCOMING: { pill: "Ready to pour" }, POURING: { pill: "Tasting now" },
  LOCKED: { pill: "Collecting team answers" }, REVEALED: { pill: "Revealed" },
};

function KeyScale({ name, value, label, lo, hi }: {
  name: string; value: number | null; label: string; lo: string; hi: string;
}) {
  return (
    <label className="field" style={{ gap: ".25rem" }}>
      <span className="small" style={{ display: "flex", justifyContent: "space-between" }}>
        <b style={{ color: "var(--ink)" }}>{label}</b>
        <span>{lo} → {hi}</span>
      </span>
      <select name={name} defaultValue={value ?? ""}>
        <option value="">Not set</option>
        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </label>
  );
}

export default function WinesTab({ event }: { event: { id: string; wineCount: number; mapMode: string; wines: Wine[]; teams?: { mapGuesses?: { wineId: string }[] }[] } }) {
  const mode = mapMode(event.mapMode);
  const used = new Set(event.wines.map((w) => w.position));
  // only offer letters the printed card actually has
  const letters = POSITIONS.slice(0, event.wineCount);
  const started = event.wines.some((wine) => wine.stage !== "UPCOMING" || wine.submissions.length > 0);
  const live = CATEGORIES.filter((category) => playable(event.wines as QuizWine[], category));

  return (
    <div className="stack" style={{ gap: "1.4rem" }}>
      {event.wines.length > 0 && <div><a className="btn" href={`/t/${event.id}/preview`}>Preview wine reveals →</a></div>}
      <details className="quiz-readiness"><summary>Quiz categories · {live.length} ready</summary><div className="row">
        {CATEGORIES.map((category) => <span key={category} className={`pill ${live.includes(category) ? "pill-olive" : "pill-warn"}`} title={whyNotPlayable(event.wines as QuizWine[], category) ?? "Ready"}>
          {live.includes(category) ? "✓" : "○"} {CATEGORY_META[category].title}</span>)}
      </div>
      {CATEGORIES.filter((category) => !live.includes(category)).map((category) => <p className="small" key={category}>{CATEGORY_META[category].title}: {whyNotPlayable(event.wines as QuizWine[], category)}.</p>)}
      </details>
      <div className="setup-flow wines-flow">
      {!started && <AddWine key={event.wines.length} eventId={event.id} letters={letters} used={[...used]} />}
      <section>
        <div className="section-title">Your wines · {event.wines.length}/{event.wineCount}</div>
        {event.wines.length === 0 ? (
          <p className="empty">Add wine A to begin.</p>
        ) : (
          <div className="grid-wines">
            {event.wines.map((w) => {
              const stage = STAGES[w.stage] ?? STAGES.UPCOMING;
              return (
                <details key={w.id} className="card wine-config" name="wine-details" data-position={w.position}>
                  <summary className="spread wine-summary" style={{ marginBottom: ".5rem" }}>
                    <div>
                      <span className="label">Wine {w.position} · {w.side === "RED" ? "red" : "white"}</span>
                      <h3 style={{ marginTop: ".15rem" }}>{w.name}</h3>
                      <p className="small">
                        {[w.producer, w.vintage, w.appellation ?? w.region].filter(Boolean).join(" · ") || "No details yet"}
                      </p>
                    </div>
                    <div className="row" style={{ justifyContent: "flex-end" }}>
                      <span className="pill">{stage.pill}</span>
                      <span className="pill">{w.submissions.length} scanned</span>
                    </div>
                  </summary>

                  <div className="row" style={{ marginBottom: ".8rem" }}>
                    {dec(w.priceNok) && <span className="pill pill-claret">kr {dec(w.priceNok)}</span>}
                    {dec(w.alcohol) && <span className="pill">{dec(w.alcohol)}%</span>}
                    {dec(w.sugarGl) && <span className="pill">sugar {dec(w.sugarGl)} g/l</span>}
                    {dec(w.acidGl) && <span className="pill">acid {dec(w.acidGl)} g/l</span>}
                    {w.priceBucket != null && <span className="pill pill-olive">answer: {PRICE_BUCKETS[w.priceBucket]}</span>}
                    {w.keyFlavours.length > 0 && <span className="pill pill-olive">{w.keyFlavours.length} aromas keyed</span>}
                    {w.sourceRef && <span className="pill">Polet {w.sourceRef}</span>}
                  </div>

                  {w.grapes && <p className="small" style={{ marginBottom: ".5rem" }}><b>Grapes:</b> {w.grapes}</p>}
                  {w.tastingNote && <p className="small" style={{ marginBottom: ".8rem", fontStyle: "italic" }}>&ldquo;{w.tastingNote}&rdquo;</p>}

                  {mapEnabled(mode) && <div className="wine-map-setup">
                    {mode === "EUROPE" && outsideEurope(w.country) && <p className="note">{w.country} is outside Europe. Use a European wine or choose World in Setup. This wine is still saved.</p>}
                    {w.mapLatitude != null && !pointCell(w, mode) && <p className="note">This saved location is outside the selected map. Choose World in Setup, or check the reference point.</p>}
                    <MapTarget key={`${w.id}-${mode}-${w.mapLatitude}-${w.mapLongitude}`} wineId={w.id} mode={mode}
                      initial={{ mapLatitude: w.mapLatitude, mapLongitude: w.mapLongitude }} region={[w.appellation ?? w.region, w.country].filter(Boolean).join(", ")}
                      hasAnswers={event.teams?.some((team) => team.mapGuesses?.some((guess) => guess.wineId === w.id)) ?? false} />
                  </div>}
                  <details>
                    <summary className="small" style={{ cursor: "pointer" }}>Answer key &amp; details</summary>
                    <form action={updateWine} className="stack" style={{ gap: ".8rem", marginTop: ".9rem" }}>
                      <input type="hidden" name="wineId" value={w.id} />
                      <div className="row" style={{ gap: ".6rem" }}>
                        <label className="field" style={{ flex: 2, minWidth: "140px" }}>
                          <span className="label">Name</span>
                          <input type="text" name="name" defaultValue={w.name} />
                        </label>
                        <label className="field" style={{ flex: 2, minWidth: "120px" }}>
                          <span className="label">Producer</span>
                          <input type="text" name="producer" defaultValue={w.producer ?? ""} />
                        </label>
                        <label className="field" style={{ flex: 1, minWidth: "80px" }}>
                          <span className="label">Vintage</span>
                          <input type="number" name="vintage" defaultValue={w.vintage ?? ""} />
                        </label>
                        <label className="field" style={{ flex: 1, minWidth: "100px" }}>
                          <span className="label">Side</span>
                          <select name="side" defaultValue={w.side}>
                            <option value="WHITE">White</option>
                            <option value="RED">Red</option>
                          </select>
                        </label>
                      </div>

                      <div className="answer-entry-grid">
                        <label className="field"><span className="label">Price (NOK)</span><input type="number" name="priceNok" min="0" step="0.01" defaultValue={dec(w.priceNok) ?? ""} /></label>
                        <label className="field"><span className="label">Country</span><input type="text" name="country" defaultValue={w.country ?? ""} /></label>
                        <label className="field"><span className="label">Region</span><input type="text" name="region" defaultValue={w.region ?? ""} /></label>
                        <label className="field"><span className="label">Appellation</span><input type="text" name="appellation" defaultValue={w.appellation ?? ""} /></label>
                      </div>
                      <label className="field"><span className="label">Grapes</span><input type="text" name="grapes" defaultValue={w.grapes ?? ""} placeholder="Chardonnay 100%" /></label>
                      <label className="field"><span className="label">Tasting note for the quiz</span><textarea name="tastingNote" rows={3} defaultValue={w.tastingNote ?? ""} /></label>
                      {started && <p className="note">The quiz has started. Changing these facts can change the answer options on already printed team sheets. Check the sheets before continuing.</p>}
                      <label className="field">
                        <span className="label">Individual price bucket (optional)</span>
                        <select name="priceBucket" defaultValue={w.priceBucket ?? ""}>
                          <option value="">Not set</option>
                          {PRICE_BUCKETS.map((b, i) => <option key={b} value={i}>{b} kr</option>)}
                        </select>
                      </label>

                      <div>
                        <span className="label">Reference values for structure</span>
                        <div className="row" style={{ gap: ".6rem", marginTop: ".4rem" }}>
                          <div style={{ flex: 1, minWidth: "110px" }}><KeyScale name="keyBody" value={w.keyBody} label="Body" lo="Light" hi="Full" /></div>
                          <div style={{ flex: 1, minWidth: "110px" }}><KeyScale name="keyAcidity" value={w.keyAcidity} label="Acidity" lo="Soft" hi="Zingy" /></div>
                          <div style={{ flex: 1, minWidth: "110px" }}><KeyScale name="keyTannin" value={w.keyTannin} label="Tannin" lo="Smooth" hi="Grippy" /></div>
                          <div style={{ flex: 1, minWidth: "110px" }}><KeyScale name="keySweetness" value={w.keySweetness} label="Sweetness" lo="Dry" hi="Sweet" /></div>
                          <div style={{ flex: 1, minWidth: "110px" }}><KeyScale name="keyAlcohol" value={w.keyAlcohol} label="Alcohol" lo="Low" hi="High" /></div>
                        </div>
                      </div>

                      <details>
                        <summary className="label">Optional aroma reference for tasting cards</summary>
                        <p className="small" style={{ margin: ".25rem 0 .5rem" }}>
                          Select the aromas to use as a reference. Six to eight is usually enough. A match
                          in the same aroma family earns half credit.
                          {w.tastingNote && " Their tasting note is quoted above."}
                        </p>
                        {/* tells the action this form carries the checkboxes, since
                            "none ticked" and "not on this form" look identical */}
                        <input type="hidden" name="keyFlavoursPresent" value="1" />
                        <div className="stack" style={{ gap: ".8rem" }}>
                          {TIERS.map((tier) => (
                            <div key={tier}>
                              <div className="small" style={{ fontSize: ".7rem", marginBottom: ".3rem" }}>
                                <b style={{ color: "var(--ink)" }}>{tier}</b>: {TIER_BLURB[tier]}
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: ".6rem" }}>
                                {categoriesFor(w.side).filter((c) => c.tier === tier).map((c) => (
                                  <div key={c.name}>
                                    <div className="small" style={{ fontSize: ".68rem", marginBottom: ".15rem" }}>{c.name}</div>
                                    <div className="chips">
                                      {c.options.map((o) => (
                                        <label key={o} className="chip chip-wide">
                                          <input type="checkbox" name="keyFlavours" value={`${c.name}|${o}`}
                                                 defaultChecked={w.keyFlavours.includes(`${c.name}|${o}`)} />
                                          <span>{o}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>

                      <label className="field">
                        <span className="label">Note shown before the reveal</span>
                        <input type="text" name="teaser" defaultValue={w.teaser ?? ""}
                               placeholder="A short note that does not identify the wine" />
                      </label>

                      <div className="row">
                        <button className="btn btn-primary btn-sm" type="submit">Save</button>
                      </div>
                    </form>

                    <div className="row" style={{ marginTop: ".8rem" }}>
                      {w.sourceUrl && <form action={refreshWine}>
                        <input type="hidden" name="wineId" value={w.id} />
                        <SubmitButton className="btn btn-sm" pending="Reading Vinmonopolet…">Refresh bottle facts</SubmitButton>
                      </form>}
                      {!started && <form action={deleteWine}>
                        <input type="hidden" name="wineId" value={w.id} />
                        <button className="btn btn-sm btn-quiet" type="submit">Remove</button>
                      </form>}
                    </div>
                  </details>
                </details>
              );
            })}
          </div>
        )}
      </section>

      {started && <aside className="card"><h3>The tasting has started.</h3><p className="small">The bottle letters stay fixed so printed quiz sheets and collected cards keep matching.</p><a className="btn btn-primary" href={`/t/${event.id}/run`}>Return to the quiz →</a></aside>}
      </div>
    </div>
  );
}
