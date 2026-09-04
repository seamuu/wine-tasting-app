import { nameTaster } from "../../actions";
import { PRICE_BUCKETS, splitFlavour } from "@/lib/card";

type Submission = {
  id: string; priceBucket: number | null; rating: number | null;
  body: number | null; acidity: number | null; tannin: number | null;
  sweetness: number | null; alcohol: number | null;
  flavours: string[]; status: string; reviewNote: string | null;
  taster: { id: string; idA: string; idB: string; name: string | null };
};
type Wine = {
  id: string; position: string; name: string; side: string; stage: string;
  priceBucket: number | null;
  keyBody: number | null; keyAcidity: number | null; keyTannin: number | null;
  keySweetness: number | null; keyAlcohol: number | null;
  submissions: Submission[];
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const fmt = (n: number | null) => (n == null ? "—" : n.toFixed(1));

function Bar({ value, of = 5 }: { value: number | null; of?: number }) {
  const pct = value == null ? 0 : Math.max(4, (value / of) * 100);
  return (
    <span style={{ display: "block", height: 6, borderRadius: 3, background: "var(--rule)", position: "relative" }}>
      <i style={{ position: "absolute", inset: "0 auto 0 0", width: `${pct}%`, borderRadius: 3, background: "var(--claret)" }} />
    </span>
  );
}

export default function ResultsTab({ event }: { event: { id: string; wines: Wine[]; tasters: { id: string; idA: string; idB: string; name: string | null }[] } }) {
  const anything = event.wines.some((w) => w.submissions.length > 0);

  return (
    <div className="stack" style={{ gap: "2.4rem" }}>
      {!anything && (
        <p className="empty">
          Nothing scanned yet. Fill in a card, photograph it on the Scan tab, and it lands here.
        </p>
      )}

      {event.wines.filter((w) => w.submissions.length > 0).map((w) => {
        const subs = w.submissions;
        const ratings = subs.map((s) => s.rating).filter((n): n is number => n != null);
        const guessedRight = w.priceBucket == null ? null
          : subs.filter((s) => s.priceBucket === w.priceBucket).length;

        // how often each flavour was marked, most-found first
        const tally = new Map<string, number>();
        for (const s of subs) for (const f of s.flavours) tally.set(f, (tally.get(f) ?? 0) + 1);
        const found = [...tally.entries()].sort((a, b) => b[1] - a[1]);

        const attrs: [string, (s: Submission) => number | null, number | null][] = [
          ["Body", (s) => s.body, w.keyBody],
          ["Acidity", (s) => s.acidity, w.keyAcidity],
          ["Tannin", (s) => s.tannin, w.keyTannin],
          ["Sweetness", (s) => s.sweetness, w.keySweetness],
          ["Alcohol", (s) => s.alcohol, w.keyAlcohol],
        ];

        return (
          <section key={w.id}>
            <div className="section-title">Wine {w.position} · {w.name}</div>

            <div className="row" style={{ gap: "2rem", alignItems: "flex-start" }}>
              <div style={{ flex: "1 1 200px" }}>
                <span className="label">Room&rsquo;s rating</span>
                <p className="serif" style={{ fontSize: "2rem", margin: ".1rem 0" }}>
                  {ratings.length ? `${fmt(mean(ratings))} / 10` : "—"}
                </p>
                <p className="small">
                  {ratings.length
                    ? `${ratings.length} of ${subs.length} gave a score · spread ${Math.min(...ratings)}–${Math.max(...ratings)}`
                    : "nobody scored it"}
                </p>
              </div>

              <div style={{ flex: "1 1 200px" }}>
                <span className="label">Price round</span>
                <p className="serif" style={{ fontSize: "2rem", margin: ".1rem 0" }}>
                  {guessedRight == null ? "—" : `${guessedRight} of ${subs.length}`}
                </p>
                <p className="small">
                  {w.priceBucket == null
                    ? "no correct bucket set on this wine yet"
                    : `answer was ${PRICE_BUCKETS[w.priceBucket]} kr`}
                </p>
              </div>

              <div style={{ flex: "2 1 280px" }}>
                <span className="label">Structure — room against the key</span>
                <div className="stack" style={{ gap: ".4rem", marginTop: ".4rem" }}>
                  {attrs.map(([label, pick, key]) => {
                    const m = mean(subs.map(pick).filter((n): n is number => n != null));
                    return (
                      <div key={label} style={{ display: "grid", gridTemplateColumns: "5.5rem 1fr 3.6rem", gap: ".6rem", alignItems: "center" }}>
                        <span className="small" style={{ color: "var(--ink)" }}>{label}</span>
                        <Bar value={m} />
                        <span className="small tabular" style={{ textAlign: "right" }}>
                          {fmt(m)}{key != null ? ` / ${key}` : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ marginTop: "1.2rem" }}>
              <span className="label">What the room found</span>
              <div className="row" style={{ gap: ".3rem", marginTop: ".5rem" }}>
                {found.length === 0 && <span className="small">no flavours marked</span>}
                {found.map(([f, n]) => {
                  const { category, option } = splitFlavour(f);
                  return (
                    <span key={f} className="pill" title={category}>
                      {option}<span className="tabular" style={{ opacity: .7 }}>{n}</span>
                    </span>
                  );
                })}
              </div>
            </div>

            {subs.some((s) => s.status === "NEEDS_REVIEW") && (
              <p className="note" style={{ marginTop: "1rem" }}>
                {subs.filter((s) => s.status === "NEEDS_REVIEW").length} card(s) came in flagged:{" "}
                {subs.filter((s) => s.status === "NEEDS_REVIEW").map((s) => `${s.taster.idA} ${s.taster.idB}${s.reviewNote ? ` (${s.reviewNote})` : ""}`).join("; ")}
              </p>
            )}
          </section>
        );
      })}

      {event.tasters.length > 0 && (
        <section>
          <div className="section-title">Who&rsquo;s who</div>
          <p className="lede" style={{ marginBottom: ".9rem" }}>
            Nobody wrote a name on a card. Put real ones here and the results read properly.
          </p>
          <div className="grid-wines" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))" }}>
            {event.tasters.map((t) => (
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
