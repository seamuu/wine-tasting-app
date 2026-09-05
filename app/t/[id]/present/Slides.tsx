import { PRICE_BUCKETS, splitFlavour } from "@/lib/card";
import { scoreWine, hasKey } from "@/lib/scoring";
import {
  consensus, leaderboard, mean, ratingHistogram, superlatives,
  tasterLabel, wheelData, type WineRow,
} from "@/lib/tally";
import Wheel, { WheelLegend } from "../Wheel";
import { Histogram, PriceSpread, StructureStrips } from "../Charts";

/** Any wheel or chart lives inside one of these so it shrinks with the slide. */
function Fit({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "relative", minHeight: 0, minWidth: 0, height: "100%" }}>
      <div style={{ position: "absolute", inset: 0 }}>{children}</div>
    </div>
  );
}

const dec = (v: unknown) => (v == null ? null : String(v));

/** Held back on a blind wine until the host reveals it. */
export function stillHidden(wine: WineRow, revealMode: string) {
  return revealMode === "BLIND" && wine.stage !== "REVEALED";
}

// ------------------------------------------------------------------ opening

export function Opening({ name, wines, tasters }: { name: string; wines: number; tasters: number }) {
  return (
    <div style={{ display: "grid", placeItems: "center", textAlign: "center" }}>
      <div>
        <h1 className="deck-title">{name}</h1>
        <p className="deck-sub" style={{ marginTop: ".8rem" }}>
          {wines} {wines === 1 ? "wine" : "wines"} · {tasters} {tasters === 1 ? "taster" : "tasters"}
        </p>
        <p className="deck-label" style={{ marginTop: "2rem" }}>Press → to begin</p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------- reveal

export function Reveal({ wine, revealMode, priceNok, producer, vintage, region, grapes, note }: {
  wine: WineRow; revealMode: string;
  priceNok: unknown; producer: string | null; vintage: number | null;
  region: string | null; grapes: string | null; note: string | null;
}) {
  const subs = wine.submissions;
  const ratings = subs.map((s) => s.rating).filter((n): n is number => n != null);
  const roomRating = mean(ratings);

  if (stillHidden(wine, revealMode)) {
    return (
      <div style={{ display: "grid", placeItems: "center", textAlign: "center" }}>
        <div>
          <div className="deck-letter">{wine.position}</div>
          <p className="deck-sub" style={{ marginTop: "1rem", maxWidth: "30ch", marginInline: "auto" }}>
            {wine.teaser || "Still in the bag."}
          </p>
          <p className="deck-label" style={{ marginTop: "1.6rem" }}>
            {subs.length} {subs.length === 1 ? "card" : "cards"} in
          </p>
        </div>
      </div>
    );
  }

  const rightGuesses = wine.priceBucket == null ? null
    : subs.filter((s) => s.priceBucket === wine.priceBucket).length;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.35fr) minmax(0,1fr)", alignItems: "stretch" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: ".5rem", minWidth: 0 }}>
        <div className="deck-label">Wine {wine.position} · {wine.side === "RED" ? "red" : "white"}</div>
        <h1 className="deck-title">{wine.name}</h1>
        <p className="deck-sub">
          {[producer, vintage, region].filter(Boolean).join(" · ")}
        </p>
        {grapes && <p className="deck-sub" style={{ fontSize: "clamp(.75rem,1.6vh,1rem)" }}>{grapes}</p>}
        {note && (
          <p className="deck-sub serif" style={{ fontStyle: "italic", marginTop: ".4rem", maxWidth: "48ch",
                                                 fontSize: "clamp(.78rem,1.8vh,1.05rem)" }}>
            &ldquo;{note}&rdquo;
          </p>
        )}
      </div>

      {/* content-height panels, centred as a group — equal rows would stretch
          three short panels down the whole screen */}
      <div style={{ display: "grid", gridTemplateRows: "repeat(3, auto)", alignContent: "center",
                    gap: "clamp(.5rem,1.6vh,1.1rem)" }}>
        <div className="deck-panel">
          <span className="deck-label">It cost</span>
          <span className="deck-stat">{dec(priceNok) ? `kr ${Number(dec(priceNok)).toFixed(0)}` : "—"}</span>
          <span className="small">
            {wine.priceBucket == null ? "no bucket set"
              : rightGuesses === null ? PRICE_BUCKETS[wine.priceBucket]
              : `${rightGuesses} of ${subs.length} put it in ${PRICE_BUCKETS[wine.priceBucket]}`}
          </span>
          <PriceSpread
            guesses={subs.map((s) => s.priceBucket).filter((n): n is number => n != null)}
            answer={wine.priceBucket}
          />
        </div>
        <div className="deck-panel">
          <span className="deck-label">The room gave it</span>
          <span className="deck-stat">{roomRating == null ? "—" : `${roomRating.toFixed(1)}`}<span style={{ fontSize: ".4em" }}> / 10</span></span>
          <span className="small">
            {ratings.length ? `${ratings.length} scored it · spread ${Math.min(...ratings)}–${Math.max(...ratings)}` : "nobody scored it"}
          </span>
        </div>
        <div className="deck-panel">
          <span className="deck-label">Actually in the glass</span>
          <div className="row" style={{ gap: ".25rem", overflow: "hidden" }}>
            {wine.keyFlavours.length === 0
              ? <span className="small">no aroma key set</span>
              : wine.keyFlavours.slice(0, 10).map((f) => (
                  <span key={f} className="pill" style={{ fontSize: ".7rem" }}>{splitFlavour(f).option}</span>
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------- room

export function Room({ wine, revealMode }: { wine: WineRow; revealMode: string }) {
  const subs = wine.submissions;
  const hidden = stillHidden(wine, revealMode);
  // A blind wine still gets its wheel — those are the room's own answers — but
  // the answer key stays off it, or the outline gives the game away.
  const key = hidden ? [] : wine.keyFlavours;
  const slices = wheelData(subs, wine.side, key);
  const ratings = subs.map((s) => s.rating).filter((n): n is number => n != null);
  const scores = scoreWine(subs, hidden ? { ...wine, keyFlavours: [], priceBucket: null } : wine);

  const best = [...subs]
    .map((s) => ({ s, sc: scores.get(s) }))
    .filter((x) => x.sc?.total != null)
    .sort((a, b) => (b.sc!.total ?? 0) - (a.sc!.total ?? 0))[0];

  const top = consensus(subs, 7);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.25fr) minmax(0,.85fr)" }}>
      <div style={{ display: "grid", gridTemplateRows: "minmax(0,1fr) auto", minHeight: 0 }}>
        <Fit>
          <Wheel
            slices={slices}
            tasters={subs.length}
            headline={wine.position}
            sub={`${subs.length} ${subs.length === 1 ? "card" : "cards"}`}
          />
        </Fit>
        <div style={{ marginTop: ".3rem" }}>
          <WheelLegend hasKey={key.length > 0} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateRows: "minmax(0,1fr) auto auto", gap: "clamp(.45rem,1.2vh,.9rem)" }}>
        <div className="deck-panel">
          <span className="deck-label">How they scored it</span>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Histogram bins={ratingHistogram(subs)} average={mean(ratings)} />
          </div>
        </div>

        <div className="deck-panel">
          <span className="deck-label">Structure{!hidden && hasKey(wine) ? " — gold is the answer" : ""}</span>
          <StructureStrips wine={hidden ? { ...wine, keyBody: null, keyAcidity: null, keyTannin: null, keySweetness: null, keyAlcohol: null } : wine} compact />
        </div>

        <div className="deck-panel">
          <span className="deck-label">What the room agreed on</span>
          <div className="row" style={{ gap: ".25rem" }}>
            {top.length === 0
              ? <span className="small">nothing marked yet</span>
              : top.map(([f, n]) => (
                  <span key={f} className="pill" style={{ fontSize: ".72rem" }}>
                    {splitFlavour(f).option}<b className="tabular" style={{ opacity: .6 }}>{n}</b>
                  </span>
                ))}
          </div>
          {!hidden && best?.sc?.total != null && (
            <span className="small" style={{ marginTop: ".2rem" }}>
              Closest to the wine: <b style={{ color: "var(--ink)" }}>{tasterLabel(best.s.taster)}</b> at {best.sc.total}%
              {best.sc.againstRoom && " (scored against the room)"}
            </span>
          )}
        </div>
      </div>

    </div>
  );
}

// -------------------------------------------------------------- leaderboard

export function Leaderboard({ wines }: { wines: WineRow[] }) {
  const rows = leaderboard(wines);
  const awards = superlatives(wines);

  if (rows.length === 0) {
    return (
      <div style={{ display: "grid", placeItems: "center" }}>
        <p className="deck-sub">No cards scanned yet, so there is nothing to rank.</p>
      </div>
    );
  }

  const peak = Math.max(1, ...rows.map((r) => r.average));
  const eligible = rows.filter((r) => r.eligible);
  const rest = rows.filter((r) => !r.eligible);

  return (
    <div style={{ display: "grid", gridTemplateColumns: awards.length ? "minmax(0,1.5fr) minmax(0,1fr)" : "1fr" }}>
     <div style={{ display: "flex", flexDirection: "column", minHeight: 0, gap: ".4rem" }}>
      {/* one equal row per person, so the standings fill the screen whether
          there are three of you or twelve */}
      <div style={{ display: "grid", gridTemplateRows: `repeat(${Math.min(12, eligible.length)}, minmax(0,1fr))`,
                    gap: ".35rem", minHeight: 0, flex: 1, overflow: "hidden" }}>
        {eligible.slice(0, 12).map((r, i) => (
          <div key={r.taster.id} style={{ display: "grid", gridTemplateColumns: "1.6rem minmax(0,1fr) 3.4rem", gap: ".6rem", alignItems: "center" }}>
            <span className="serif tabular" style={{ fontSize: "clamp(.9rem,2.2vh,1.4rem)", color: i === 0 ? "var(--claret)" : "var(--ink-soft)" }}>
              {i + 1}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem" }}>
                <span className="serif" style={{ fontSize: "clamp(.85rem,2.1vh,1.3rem)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.label}
                </span>
                <span className="small tabular" style={{ whiteSpace: "nowrap" }}>{r.played} {r.played === 1 ? "wine" : "wines"}</span>
              </div>
              <span style={{ display: "block", height: 5, borderRadius: 3, background: "var(--rule)", marginTop: 2 }}>
                <i style={{ display: "block", height: "100%", borderRadius: 3, background: i === 0 ? "var(--claret)" : "var(--gold)",
                            width: `${Math.max(3, (r.average / peak) * 100)}%` }} />
              </span>
            </div>
            <span className="serif tabular" style={{ fontSize: "clamp(.95rem,2.4vh,1.5rem)", textAlign: "right" }}>
              {Math.round(r.average)}%
            </span>
          </div>
        ))}
      </div>
      {rest.length > 0 && (
        <p className="small">
          Joined late, so ranked apart: {rest.map((r) => `${r.label} (${Math.round(r.average)}%)`).join(", ")}
        </p>
      )}
     </div>

      {awards.length > 0 && (
        <div style={{ display: "grid", gridTemplateRows: `repeat(${awards.length}, auto)`, alignContent: "center",
                      gap: "clamp(.4rem,1.4vh,.9rem)" }}>
          {awards.map((a) => (
            <div key={a.title} className="deck-panel" style={{ justifyContent: "center" }}>
              <span className="deck-label">{a.title}</span>
              <span className="serif" style={{ fontSize: "clamp(1rem,2.8vh,1.8rem)", lineHeight: 1.1 }}>{a.who}</span>
              <span className="small">{a.detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
