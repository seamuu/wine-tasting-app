"use client";

import { useEffect, useRef, useState } from "react";
import { addWine } from "../../actions";
import { isPoletUrl, type PoletHit } from "@/lib/vinmonopolet";

/**
 * Add a wine by searching the Polet, so nobody has to go and find a link —
 * though a pasted product link is still taken, for the day search stops
 * answering or the wine is easier to find in a browser tab.
 *
 * Picking a result only fills the form in — the letter and the side are still
 * yours to confirm before anything is saved, because getting the letter wrong
 * is the one mistake that quietly misfiles every card for that wine.
 */
export default function AddWine({ eventId, letters, used }: {
  eventId: string;
  letters: readonly string[];
  used: string[];
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PoletHit[]>([]);
  const [state, setState] = useState<"idle" | "searching" | "error">("idle");
  const [picked, setPicked] = useState<PoletHit | null>(null);
  const [side, setSide] = useState("RED");
  const seq = useRef(0);

  const q = query.trim();
  // a pasted link is already the answer, so it never gets searched for; a link
  // copied out of the address bar can arrive without its https, or with http
  const asUrl = q.replace(/^http:\/\//i, "https://")
                 .replace(/^(?=(www\.)?vinmonopolet\.no\/)/i, "https://");
  const pasted = !picked && isPoletUrl(asUrl) ? asUrl : null;
  const searchable = q.length >= 2 && !pasted && picked?.name !== q;

  useEffect(() => {
    if (!searchable) return;
    // one search per pause in typing, and a sequence number so a slow earlier
    // response can never overwrite a newer one
    const id = ++seq.current;
    const timer = setTimeout(async () => {
      setState("searching");
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (id !== seq.current) return;
        setHits(data.hits ?? []);
        setState(data.error ? "error" : "idle");
      } catch {
        if (id === seq.current) setState("error");
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [q, searchable]);

  function type(value: string) {
    setQuery(value);
    setPicked(null);
    if (value.trim().length < 2) { setHits([]); setState("idle"); }
  }

  function choose(hit: PoletHit) {
    seq.current += 1;              // abandon any search still in flight
    setPicked(hit);
    setQuery(hit.name);
    setHits([]);
    setState("idle");
    if (hit.side) setSide(hit.side);
  }

  return (
    <section className="card">
      <div className="section-title">Add a wine</div>

      <form action={addWine} className="stack" style={{ gap: "1rem" }}>
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="sourceUrl" value={picked?.url ?? pasted ?? ""} />

        <div style={{ position: "relative" }}>
          <label className="field">
            <span className="label">Search Vinmonopolet, or paste a link</span>
            <input
              type="text" autoComplete="off" placeholder="amarone terre di leone"
              value={query}
              onChange={(e) => type(e.target.value)}
            />
          </label>

          {!pasted && (hits.length > 0 || state !== "idle") && (
            <div className="card" style={{
              position: "absolute", zIndex: 5, top: "100%", left: 0, right: 0, marginTop: ".3rem",
              maxHeight: "19rem", overflowY: "auto", padding: ".3rem", boxShadow: "var(--shadow)",
            }}>
              {state === "searching" && <p className="small" style={{ padding: ".5rem" }}>Searching…</p>}
              {state === "error" && (
                <p className="small" style={{ padding: ".5rem", color: "var(--warn)" }}>
                  Vinmonopolet didn&rsquo;t answer. Paste a product link into the box instead.
                </p>
              )}
              {hits.map((h) => (
                <button key={h.code} type="button" onClick={() => choose(h)}
                        style={{ display: "flex", gap: ".6rem", alignItems: "center", width: "100%",
                                 textAlign: "left", background: "none", border: 0, borderRadius: 7,
                                 padding: ".45rem .5rem", cursor: "pointer", font: "inherit" }}>
                  {h.thumb
                    /* eslint-disable-next-line @next/next/no-img-element */
                    ? <img src={h.thumb} alt="" width={28} height={28}
                           style={{ objectFit: "contain", flex: "0 0 28px" }} />
                    : <span style={{ flex: "0 0 28px" }} />}
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: "block", fontSize: ".85rem", fontWeight: 600, lineHeight: 1.25 }}>
                      {h.name}
                    </span>
                    <span className="small" style={{ fontSize: ".72rem" }}>
                      {[h.category, h.district, h.alcohol ? `${h.alcohol}%` : null,
                        h.volumeCl && h.volumeCl !== 75 ? `${h.volumeCl} cl` : null]
                        .filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {h.priceNok != null && (
                    <span className="pill tabular" style={{ whiteSpace: "nowrap" }}>kr {h.priceNok.toFixed(0)}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {picked || pasted ? (
          <p className="note note-olive" style={{ padding: ".6rem .8rem" }}>
            {picked
              ? <><b>{picked.name}</b> — Polet {picked.code}. </>
              : <>That link gets read when you add it. </>}
            Price, alcohol, sugar, acid, grapes and their tasting note all come across, and the
            price round scores itself.{" "}
            <button type="button" className="btn btn-sm btn-quiet"
                    onClick={() => type("")}>Clear</button>
          </p>
        ) : (
          <label className="field">
            <span className="label">Or just a name</span>
            <input type="text" name="name" placeholder="The orange one Kristian brought" />
            <span className="small">
              Fine on its own — you lose the automatic price answer, so set that bucket yourself.
            </span>
          </label>
        )}

        <div className="row" style={{ gap: ".6rem" }}>
          <label className="field" style={{ flex: 1 }}>
            <span className="label">Letter</span>
            <select name="position" defaultValue={letters.find((l) => !used.includes(l)) ?? letters[0]}>
              {letters.map((p) => (
                <option key={p} value={p}>{p}{used.includes(p) ? " — replaces what's there" : ""}</option>
              ))}
            </select>
          </label>
          <label className="field" style={{ flex: 1 }}>
            <span className="label">Side of the card</span>
            <select name="side" value={side} onChange={(e) => setSide(e.target.value)}>
              <option value="WHITE">White</option>
              <option value="RED">Red</option>
            </select>
          </label>
        </div>

        <button className="btn btn-primary" type="submit">Add to the flight</button>
      </form>
    </section>
  );
}
