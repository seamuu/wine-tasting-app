import { nameTaster, deleteSubmission } from "../../actions";
import { PRICE_BUCKETS, splitFlavour } from "@/lib/card";
import { scoreWine } from "@/lib/scoring";
import {
  consensus, leaderboard, mean, ratingHistogram, superlatives,
  tasterLabel, wheelData, type WineRow,
} from "@/lib/tally";
import Wheel, { WheelLegend } from "./Wheel";
import { Histogram, PriceSpread, StructureStrips } from "./Charts";
import { isUnnamedTaster } from "@/lib/taster";

/**
 * The long version, for afterwards. Unlike the present deck this is allowed to
 * scroll — the trade is that it shows the per-person breakdown the big screen
 * has no room for.
 */

type Taster = { id: string; idA: string; idB: string; name: string | null };

const pct = (n: number | null | undefined) => (n == null ? "Not set" : `${Math.round(n * 100)}%`);

export default function ResultsTab({ event }: {
  event: { id: string; revealMode: string; wines: WineRow[]; tasters: Taster[] };
}) {
  const played = event.wines.filter((w) => w.submissions.length > 0);
  const standings = leaderboard(event.wines);
  const awards = superlatives(event.wines);
  const namedTasters = event.tasters.filter(t => !isUnnamedTaster(t));

  if (played.length === 0) {
    return (
      <p className="empty">
        Nothing scanned yet. Fill in a card, photograph it on the Scan tab, and it lands here.
      </p>
    );
  }

  return (
    <div className="stack" style={{ gap: "2.8rem" }}>
      <section>
        <div className="section-title">How close everyone got</div>
        <div className="split-even">
          <div className="stack" style={{ gap: ".5rem" }}>
            {standings.map((r, i) => (
              <div key={r.taster.id} style={{ display: "grid", gridTemplateColumns: "1.4rem minmax(0,1fr) 3rem", gap: ".7rem", alignItems: "center" }}>
                <span className="small tabular">{r.eligible ? i + 1 : "–"}</span>
                <div>
                  <div className="spread">
                    <span style={{ fontWeight: 600, fontSize: ".92rem" }}>{r.label}</span>
                    <span className="small tabular">{r.played} {r.played === 1 ? "wine" : "wines"}</span>
                  </div>
                  <span style={{ display: "block", height: 5, borderRadius: 3, background: "var(--rule)", marginTop: 3 }}>
                    <i style={{ display: "block", height: "100%", borderRadius: 3, width: `${Math.max(3, r.average)}%`,
                                background: i === 0 && r.eligible ? "var(--claret)" : "var(--gold)" }} />
                  </span>
                </div>
                <span className="tabular" style={{ textAlign: "right", fontWeight: 600 }}>{Math.round(r.average)}%</span>
              </div>
            ))}
            <p className="small" style={{ marginTop: ".5rem" }}>
              Price 25, structure 35, aroma 40. The right aroma family with the wrong word takes
              half marks, and marking everything counts against you.
            </p>
          </div>

          {awards.length > 0 && (
            <div className="grid-wines" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))" }}>
              {awards.map((a) => (
                <div key={a.title} className="card">
                  <span className="label">{a.title}</span>
                  <p className="serif" style={{ fontSize: "1.15rem", margin: ".2rem 0 .1rem" }}>{a.who}</p>
                  <span className="small">{a.detail}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {played.map((wine) => {
        const subs = wine.submissions;
        const scores = scoreWine(subs, wine);
        const ratings = subs.map((s) => s.rating).filter((n): n is number => n != null);
        const ranked = [...subs]
          .map((s) => ({ s, sc: scores.get(s) }))
          .sort((a, b) => (b.sc?.total ?? 0) - (a.sc?.total ?? 0));
        const usedRoom = ranked[0]?.sc?.againstRoom ?? false;

        return (
          <section key={wine.id}>
            <div className="section-title">
              Wine {wine.position} · {wine.name}
              {usedRoom && ": no answer key, so scored against the room"}
            </div>

            <div className="split-even">
              <div>
                <Wheel
                  slices={wheelData(subs, wine.side, wine.keyFlavours)}
                  tasters={subs.length}
                  headline={wine.position}
                  sub={`${subs.length} ${subs.length === 1 ? "card" : "cards"}`}
                  size={460}
                />
                <div style={{ marginTop: ".4rem" }}>
                  <WheelLegend hasKey={wine.keyFlavours.length > 0} />
                </div>
              </div>

              <div className="stack" style={{ gap: "1.3rem" }}>
                <div>
                  <span className="label">Ratings</span>
                  <div style={{ height: 120, marginTop: ".4rem" }}>
                    <Histogram bins={ratingHistogram(subs)} average={mean(ratings)} />
                  </div>
                </div>

                <div>
                  <span className="label">
                    Structure{wine.keyBody != null || wine.keyAcidity != null ? ": gold is the answer" : ""}
                  </span>
                  <div style={{ marginTop: ".4rem" }}>
                    <StructureStrips wine={wine} />
                  </div>
                </div>

                <div>
                  <span className="label">
                    Price{wine.priceBucket != null ? `: it was ${PRICE_BUCKETS[wine.priceBucket]} kr` : ""}
                  </span>
                  <div style={{ marginTop: ".4rem" }}>
                    <PriceSpread
                      guesses={subs.map((s) => s.priceBucket).filter((n): n is number => n != null)}
                      answer={wine.priceBucket}
                    />
                  </div>
                </div>

                <div>
                  <span className="label">What the room found</span>
                  <div className="row" style={{ gap: ".3rem", marginTop: ".4rem" }}>
                    {consensus(subs, 12).map(([f, n]) => (
                      <span key={f} className="pill" title={splitFlavour(f).category}>
                        {splitFlavour(f).option}<b className="tabular" style={{ opacity: .6 }}>{n}</b>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "1.4rem", overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: ".85rem", minWidth: 420 }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid var(--rule)" }}>
                    <th style={{ padding: ".35rem .5rem .35rem 0", fontWeight: 600 }}>Taster</th>
                    <th style={{ padding: ".35rem .5rem", fontWeight: 600, textAlign: "right" }}>Price</th>
                    <th style={{ padding: ".35rem .5rem", fontWeight: 600, textAlign: "right" }}>Structure</th>
                    <th style={{ padding: ".35rem .5rem", fontWeight: 600, textAlign: "right" }}>Aroma</th>
                    <th style={{ padding: ".35rem 0 .35rem .5rem", fontWeight: 600, textAlign: "right" }}>Match</th>
                    <th style={{ padding: ".35rem 0 .35rem .5rem" }}><span className="sr-only">Remove</span></th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map(({ s, sc }) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid var(--paper-3)" }}>
                      <td style={{ padding: ".35rem .5rem .35rem 0" }}>
                        {tasterLabel(s.taster)}
                        {s.status === "NEEDS_REVIEW" && <span className="pill pill-warn" style={{ marginLeft: ".4rem", fontSize: ".65rem" }}>check</span>}
                        {s.status === "MANUAL" && <span className="pill" style={{ marginLeft: ".4rem", fontSize: ".65rem" }}>typed in</span>}
                      </td>
                      <td className="tabular" style={{ padding: ".35rem .5rem", textAlign: "right" }}>{pct(sc?.price)}</td>
                      <td className="tabular" style={{ padding: ".35rem .5rem", textAlign: "right" }}>{pct(sc?.structure)}</td>
                      <td className="tabular" style={{ padding: ".35rem .5rem", textAlign: "right" }}>{pct(sc?.flavour)}</td>
                      <td className="tabular" style={{ padding: ".35rem 0 .35rem .5rem", textAlign: "right", fontWeight: 600 }}>
                        {sc?.total == null ? "Not set" : `${sc.total}%`}
                      </td>
                      <td style={{ padding: ".35rem 0 .35rem .5rem", textAlign: "right" }}>
                        <form action={deleteSubmission}>
                          <input type="hidden" name="submissionId" value={s.id} />
                          <button className="btn btn-sm btn-quiet" type="submit"
                                  title="Remove this card: use it for test scans">×</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {namedTasters.length > 0 && (
        <section>
          <div className="section-title">Who&rsquo;s who</div>
          <p className="lede" style={{ marginBottom: ".9rem" }}>
            Add people’s names to show them alongside their card names.
          </p>
          <div className="grid-wines" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))" }}>
            {namedTasters.map((t) => (
              <form key={t.id} action={nameTaster} className="row" style={{ gap: ".45rem" }}>
                <input type="hidden" name="tasterId" value={t.id} />
                <span className="pill" style={{ whiteSpace: "nowrap" }}>{t.idA} {t.idB}</span>
                <input type="text" name="name" defaultValue={t.name ?? ""} placeholder="Real name"
                       style={{ flex: 1, minWidth: 0 }} />
                <button className="btn btn-sm" type="submit">Save</button>
              </form>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
