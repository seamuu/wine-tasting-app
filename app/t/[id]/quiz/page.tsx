import { notFound } from "next/navigation";
import PrintedMapSheet from "../PrintedMapSheet";
import { mapMode, mapEnabled } from "@/lib/map";
import { prisma } from "@/lib/prisma";
import {
  CATEGORIES, CATEGORY_META, OPTION_LABELS, optionFor, optionOrder, playable,
  whyNotPlayable, type Category, type QuizWine,
} from "@/lib/quiz";

export const dynamic = "force-dynamic";

/**
 * The team's answer sheet, printed from the actual flight.
 *
 * One per team for the whole night, rather than one per person per wine. Every
 * category is a permutation — four wines, four answers, one each — so filling
 * it in is a conversation the whole table has to have, which is the entire
 * point. Teams hand in the current wine’s row before its reveal; future
 * rows remain blank until those wines are poured.
 *
 * Not scanned. There are only two of these and sixteen answers on each, so the
 * host types them in; building a reader for a one-off layout would cost more
 * than it saves and is the likeliest thing to fail on the night.
 */
export default async function QuizSheetPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ teams?: string; maps?: string }>;
}) {
  const { id } = await params;
  const { teams: teamsParam, maps } = await searchParams;
  const extraSheets = Math.min(20, Math.max(1, parseInt(teamsParam ?? "1", 10) || 1));

  const event = await prisma.event.findUnique({
    where: { id },
    include: { wines: { orderBy: { position: "asc" } }, teams: { orderBy: { name: "asc" } } },
  });
  if (!event) notFound();

  const mode = mapMode(event.mapMode);
  const mapOnly = maps === "only";
  const sheets = event.teams.length ? event.teams.map((team) => ({ name: team.name, size: team.memberCount }))
    : Array.from({ length: extraSheets }, (_, i) => ({ name: `Team ${i + 1}`, size: null }));
  const wines = event.wines as unknown as QuizWine[];
  const live = CATEGORIES.filter((c) => playable(wines, c));
  const dropped = CATEGORIES.filter((c) => !playable(wines, c))
    .map((c) => ({ c, why: whyNotPlayable(wines, c)! }));

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 12mm 12mm 10mm; }
        @media print { .no-print { display: none !important; } }
        .qs { font-family: var(--font-body), system-ui, sans-serif; color: #241A15; }
        .qs-sheet { page-break-after: always; }
        .qs-team-pack:last-child .qs-sheet:last-child { page-break-after: auto; break-after: auto; }
        .qs-opt { break-inside: avoid; }
      `}</style>

      <main className="qs" style={{ maxWidth: "186mm", margin: "0 auto", padding: "8mm 0 20mm" }}>
        {!mapOnly && dropped.length > 0 && (
          <div className="no-print" style={{ border: "1px solid #8A5A00", background: "#FBF2DF", color: "#8A5A00",
                                             borderRadius: 8, padding: "1rem 1.2rem", marginBottom: "2rem", fontSize: ".88rem", lineHeight: 1.6 }}>
            <b>Not printed:</b>{" "}
            {dropped.map(({ c, why }) => `${CATEGORY_META[c].title.toLowerCase()} (${why})`).join("; ")}.
            <br />
            Each matching category needs a different answer for every wine. For origin,
            add a region or appellation in Wines if the country names are the same.
          </div>
        )}

        {!mapOnly && live.length === 0 && (
          <p className="no-print" style={{ padding: "2rem" }}>
            No quiz categories are ready to print. Add prices, regions, tasting notes or grapes
            in Wines. Each category needs a different answer for every wine.
          </p>
        )}

        {mapOnly && !mapEnabled(mode) && <p className="note no-print">The map round is off for this tasting. Choose Europe or World in Setup before printing.</p>}
        {sheets.map((team, t) => (
          <div key={t} className="qs-team-pack">
          {!mapOnly && live.length > 0 && <section className="qs-sheet">
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end",
                             borderBottom: "1.5px solid #241A15", paddingBottom: "2mm", marginBottom: "5mm" }}>
              <div>
                <div style={{ fontSize: "7pt", letterSpacing: ".14em", textTransform: "uppercase", color: "#6B5A4E" }}>
                  {event.name} · team answer sheet
                </div>
                <div style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: "20pt", fontWeight: 600, marginTop: "1mm" }}>
                  {team.name} {team.size != null && <span style={{ fontSize: "9pt", color: "#6B5A4E" }}>· {team.size} people</span>}
                </div>
              </div>
              <div style={{ fontSize: "7.5pt", color: "#6B5A4E", textAlign: "right", maxWidth: "62mm", lineHeight: 1.45 }}>
                Each option belongs to one wine. Hand in your answers <b>one wine at a time</b>, before the host reveals that bottle.
              </div>
            </header>

            <div className="quiz-print-blocks">{live.map((c) => (
              <QuizBlock key={c} category={c} wines={wines} eventId={event.id} />
            ))}</div>
          </section>}
          {mapEnabled(mode) && <PrintedMapSheet eventName={event.name} teamName={team.name} positions={wines.map((wine) => wine.position)} mode={mode} />}
          </div>
        ))}
      </main>
    </>
  );
}

function QuizBlock({ category, wines, eventId }: {
  category: Category; wines: QuizWine[]; eventId: string;
}) {
  const meta = CATEGORY_META[category];
  const order = optionOrder(eventId, category, wines);
  const wide = category === "NOTE";

  return (
    <div className="qs-opt" style={{ marginBottom: "7mm" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "3mm", marginBottom: "2mm" }}>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: "9pt", fontWeight: 600,
                       letterSpacing: ".06em", textTransform: "uppercase" }}>{meta.title}</span>
        <span style={{ fontSize: "7.5pt", color: "#6B5A4E" }}>{meta.blurb}</span>
        <span style={{ marginLeft: "auto", fontSize: "7pt", color: "#6E1327", fontWeight: 600 }}>{meta.owner} leads</span>
      </div>

      {/* the pool: every one of these belongs to exactly one glass */}
      <div className={`quiz-option-pool${wide ? " quiz-option-wide" : ""}`} style={{ display: "grid", gap: "1mm 4mm", marginBottom: "2.5mm",
                    gridTemplateColumns: wide ? "minmax(0, 1fr)" : `repeat(${Math.min(4, order.length)}, minmax(0, 1fr))` }}>
        {order.map((w, i) => (
          <div key={w.id} style={{ display: "flex", gap: "2mm", alignItems: "baseline", minWidth: 0, fontSize: wide ? "8pt" : "9pt" }}>
            <span style={{ fontFamily: "var(--font-mono), monospace", fontWeight: 600, flexShrink: 0, color: "#6E1327" }}>
              {OPTION_LABELS[i]}
            </span>
            <span style={{ lineHeight: 1.35, minWidth: 0, overflowWrap: "anywhere" }}>{optionFor(w, category)}</span>
          </div>
        ))}
      </div>

      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "8.5pt" }}>
        <thead>
          <tr>
            <th style={{ width: "22mm" }} />
            {order.map((_, i) => (
              <th key={i} style={{ fontFamily: "var(--font-mono), monospace", fontWeight: 600,
                                   padding: "0 0 1mm", color: "#6B5A4E" }}>{OPTION_LABELS[i]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {wines.map((w) => (
            <tr key={w.id}>
              <td style={{ fontWeight: 600, padding: "1mm 0", whiteSpace: "nowrap" }}>Wine {w.position}</td>
              {order.map((_, i) => (
                <td key={i} style={{ textAlign: "center", padding: "1mm 0" }}>
                  <span style={{ display: "inline-block", width: "4mm", height: "4mm",
                                 border: "0.35mm solid #241A15", borderRadius: "50%" }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
