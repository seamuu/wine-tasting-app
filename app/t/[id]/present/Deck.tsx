"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

export type Slide = { key: string; kicker: string; title: string; node: ReactNode };

/**
 * The projector. Arrow keys move, F goes fullscreen, Escape gets you out.
 *
 * The slides themselves are rendered on the server and handed over as nodes, so
 * this file holds no scoring or layout — only which one is on screen. Nothing
 * here scrolls: the deck fills the viewport and each slide is responsible for
 * fitting inside it.
 */
export default function Deck({ slides, eventId, eventName, initial = 0 }: {
  slides: Slide[]; eventId: string; eventName: string; initial?: number;
}) {
  const [i, setI] = useState(initial);
  const last = slides.length - 1;

  const go = useCallback((n: number) => setI(() => Math.min(last, Math.max(0, n))), [last]);

  // Keep ?s= in step with where we are, so a refresh mid-tasting comes back to
  // the same slide and a particular slide can be linked to.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("s") === String(i)) return;
    url.searchParams.set("s", String(i));
    history.replaceState(null, "", url);
  }, [i]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case "ArrowRight": case "PageDown": case " ": e.preventDefault(); setI((c) => Math.min(last, c + 1)); break;
        case "ArrowLeft": case "PageUp": e.preventDefault(); setI((c) => Math.max(0, c - 1)); break;
        case "Home": setI(0); break;
        case "End": setI(last); break;
        case "f": case "F":
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen?.().catch(() => {});
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last]);

  const slide = slides[i];

  return (
    <div className="deck">
      <header className="deck-head">
        <div>
          <div className="deck-label">{slide.kicker}</div>
          <div className="deck-title" style={{ fontSize: "clamp(1.1rem, 2.8vh, 1.7rem)" }}>{slide.title}</div>
        </div>
        <div className="deck-label" style={{ textAlign: "right", whiteSpace: "nowrap" }}>{eventName}</div>
      </header>

      <main className="deck-body" key={slide.key}>{slide.node}</main>

      <footer className="deck-foot">
        <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
          {slides.map((s, n) => (
            <a key={s.key} href={`?s=${n}`} aria-label={s.title} title={s.title}
               onClick={(e) => { e.preventDefault(); go(n); }}
               style={{ border: 0, background: "none", padding: 2, cursor: "pointer", lineHeight: 0 }}>
              <span className="deck-dot" {...(n === i ? { "data-on": "" } : {})} />
            </a>
          ))}
        </div>
        <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
          <span className="tabular">{i + 1} / {slides.length}</span>
          {/* Anchors, not buttons. A slide is addressable as ?s=N, so navigation
              is a plain link that works before React has hydrated - or when it
              never does, which in dev is one config edit away. The click
              handler takes over when the page is live, keeping it instant. */}
          <a className={`btn btn-sm${i === 0 ? " is-disabled" : ""}`} href={`?s=${Math.max(0, i - 1)}`}
             aria-disabled={i === 0}
             onClick={(e) => { e.preventDefault(); go(i - 1); }}>←</a>
          <a className={`btn btn-sm${i === last ? " is-disabled" : ""}`} href={`?s=${Math.min(last, i + 1)}`}
             aria-disabled={i === last}
             onClick={(e) => { e.preventDefault(); go(i + 1); }}>→</a>
          <span style={{ opacity: .7 }}>F for fullscreen</span>
          <Link className="btn btn-sm btn-quiet" href={`/t/${eventId}?tab=results`}>Exit</Link>
        </div>
      </footer>
    </div>
  );
}
