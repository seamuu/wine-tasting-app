import { addWine, updateWine, deleteWine, setStage } from "../../actions";
import { PRICE_BUCKETS, POSITIONS } from "@/lib/card";
import { categoriesFor, TIERS, TIER_BLURB } from "@/lib/flavours";

type Wine = {
  id: string; position: string; side: string; stage: string;
  name: string; producer: string | null; vintage: number | null;
  region: string | null; appellation: string | null; grapes: string | null;
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

const STAGES: Record<string, { next?: string; label?: string; pill: string }> = {
  UPCOMING: { next: "POURING", label: "Pour it", pill: "Not poured" },
  POURING:  { next: "LOCKED",  label: "Cards are in", pill: "Pouring" },
  LOCKED:   { next: "REVEALED", label: "Reveal it", pill: "Locked" },
  REVEALED: { pill: "Revealed" },
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
        <option value="">—</option>
        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </label>
  );
}

export default function WinesTab({ event }: { event: { id: string; wineCount: number; wines: Wine[] } }) {
  const used = new Set(event.wines.map((w) => w.position));
  // only offer letters the printed card actually has
  const letters = POSITIONS.slice(0, event.wineCount);
  const free = letters.filter((p) => !used.has(p));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(300px,360px)", gap: "2.5rem", alignItems: "start" }}>
      <section>
        <div className="section-title">The flight</div>
        {event.wines.length === 0 ? (
          <p className="empty">No wines yet. Add the first one on the right.</p>
        ) : (
          <div className="grid-wines">
            {event.wines.map((w) => {
              const stage = STAGES[w.stage] ?? STAGES.UPCOMING;
              return (
                <div key={w.id} className="card">
                  <div className="spread" style={{ marginBottom: ".5rem" }}>
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
                  </div>

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

                      <label className="field">
                        <span className="label">Correct price bucket</span>
                        <select name="priceBucket" defaultValue={w.priceBucket ?? ""}>
                          <option value="">— not set —</option>
                          {PRICE_BUCKETS.map((b, i) => <option key={b} value={i}>{b} kr</option>)}
                        </select>
                      </label>

                      <div>
                        <span className="label">Structure the room should find</span>
                        <div className="row" style={{ gap: ".6rem", marginTop: ".4rem" }}>
                          <div style={{ flex: 1, minWidth: "110px" }}><KeyScale name="keyBody" value={w.keyBody} label="Body" lo="Light" hi="Full" /></div>
                          <div style={{ flex: 1, minWidth: "110px" }}><KeyScale name="keyAcidity" value={w.keyAcidity} label="Acidity" lo="Soft" hi="Zingy" /></div>
                          <div style={{ flex: 1, minWidth: "110px" }}><KeyScale name="keyTannin" value={w.keyTannin} label="Tannin" lo="Smooth" hi="Grippy" /></div>
                          <div style={{ flex: 1, minWidth: "110px" }}><KeyScale name="keySweetness" value={w.keySweetness} label="Sweetness" lo="Dry" hi="Sweet" /></div>
                          <div style={{ flex: 1, minWidth: "110px" }}><KeyScale name="keyAlcohol" value={w.keyAlcohol} label="Alcohol" lo="Low" hi="High" /></div>
                        </div>
                      </div>

                      <div>
                        <span className="label">Aromas actually in the glass</span>
                        <p className="small" style={{ margin: ".25rem 0 .5rem" }}>
                          Tick what the wine really shows — six or eight is plenty. The right
                          family with the wrong word earns half, so a near miss still counts.
                          {w.tastingNote && " Their tasting note is quoted above."}
                        </p>
                        {/* tells the action this form carries the checkboxes, since
                            "none ticked" and "not on this form" look identical */}
                        <input type="hidden" name="keyFlavoursPresent" value="1" />
                        <div className="stack" style={{ gap: ".8rem" }}>
                          {TIERS.map((tier) => (
                            <div key={tier}>
                              <div className="small" style={{ fontSize: ".7rem", marginBottom: ".3rem" }}>
                                <b style={{ color: "var(--ink)" }}>{tier}</b> — {TIER_BLURB[tier]}
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
                      </div>

                      <label className="field">
                        <span className="label">Teaser for the blind round</span>
                        <input type="text" name="teaser" defaultValue={w.teaser ?? ""}
                               placeholder="One line that sets a mood without giving it away" />
                      </label>

                      <div className="row">
                        <button className="btn btn-primary btn-sm" type="submit">Save</button>
                      </div>
                    </form>

                    <div className="row" style={{ marginTop: ".8rem" }}>
                      {stage.next && (
                        <form action={setStage}>
                          <input type="hidden" name="wineId" value={w.id} />
                          <input type="hidden" name="stage" value={stage.next} />
                          <button className="btn btn-sm" type="submit">{stage.label}</button>
                        </form>
                      )}
                      <form action={deleteWine}>
                        <input type="hidden" name="wineId" value={w.id} />
                        <button className="btn btn-sm btn-quiet" type="submit">Remove</button>
                      </form>
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card">
        <div className="section-title">Add a wine</div>
        <form action={addWine} className="stack" style={{ gap: "1rem" }}>
          <input type="hidden" name="eventId" value={event.id} />

          <label className="field">
            <span className="label">Vinmonopolet link</span>
            <input type="url" name="sourceUrl" placeholder="https://www.vinmonopolet.no/…/p/838901" />
            <span className="small">
              Fills in the price, alcohol, sugar, acid, grapes and their tasting note — and the price
              round then scores itself.
            </span>
          </label>

          <label className="field">
            <span className="label">Or just a name</span>
            <input type="text" name="name" placeholder="The orange one Kristian brought" />
            <span className="small">
              Fine on its own. You lose the automatic price answer, so set that bucket yourself.
            </span>
          </label>

          <div className="row" style={{ gap: ".6rem" }}>
            <label className="field" style={{ flex: 1 }}>
              <span className="label">Letter</span>
              <select name="position" defaultValue={free[0] ?? letters[0]}>
                {letters.map((p) => (
                  <option key={p} value={p}>{p}{used.has(p) ? " — replaces what's there" : ""}</option>
                ))}
              </select>
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span className="label">Side of the card</span>
              <select name="side" defaultValue="RED">
                <option value="WHITE">White</option>
                <option value="RED">Red</option>
              </select>
            </label>
          </div>

          <button className="btn btn-primary" type="submit">Add to the flight</button>
        </form>
      </section>
    </div>
  );
}
