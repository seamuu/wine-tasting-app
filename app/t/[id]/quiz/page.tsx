import { notFound } from "next/navigation";
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
 * point. Teams rearrange it as they learn: nothing is locked until it is
 * handed in.
 *
 * Not scanned. There are only two of these and sixteen answers on each, so the
 * host types them in; building a reader for a one-off layout would cost more
 * than it saves and is the likeliest thing to fail on the night.
 */
export default async function QuizSheetPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ teams?: string }>;
}) {
  const { id } = await params;
  const { teams: teamsParam } = await searchParams;
  const teams = Math.min(6, Math.max(1, parseInt(teamsParam ?? "2", 10) || 2));

  const event = await prisma.event.findUnique({
    where: { id },
    include: { wines: { orderBy: { position: "asc" } } },
  });
  if (!event) notFound();

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
        .qs-sheet:last-child { page-break-after: auto; }
        .qs-opt { break-inside: avoid; }
      `}</style>

      <main className="qs" style={{ maxWidth: "186mm", margin: "0 auto", padding: "8mm 0 20mm" }}>
        {dropped.length > 0 && (
          <div className="no-print" style={{ border: "1px solid #8A5A00", background: "#FBF2DF", color: "#8A5A00",
                                             borderRadius: 8, padding: "1rem 1.2rem", marginBottom: "2rem", fontSize: ".88rem", lineHeight: 1.6 }}>
            <b>Not printed:</b>{" "}
            {dropped.map(({ c, why }) => `${CATEGORY_META[c].title.toLowerCase()} (${why})`).join("; ")}.
            <br />
            A matching round needs every wine to have its own distinct answer — if three of them
            just say &ldquo;Italia&rdquo;, there is nothing to work out. Filling in the region or
            appellation on the Wines tab brings the round back.
          </div>
        )}

        {live.length === 0 && (
          <p className="no-print" style={{ padding: "2rem" }}>
            None of the categories can be printed yet — they need every wine in the flight to have
            a price, a region, a tasting note or its grapes. Add the wines from their Vinmonopolet
            links and this fills itself in.
          </p>
        )}

        {Array.from({ length: teams }, (_, t) => (
          <section key={t} className="qs-sheet">
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end",
                             borderBottom: "1.5px solid #241A15", paddingBottom: "2mm", marginBottom: "5mm" }}>
              <div>
                <div style={{ fontSize: "7pt", letterSpacing: ".14em", textTransform: "uppercase", color: "#6B5A4E" }}>
                  {event.name} · team answer sheet
                </div>
                <div style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: "20pt", fontWeight: 600, marginTop: "1mm" }}>
                  Team {t + 1} &nbsp;<span style={{ fontSize: "11pt", color: "#6B5A4E" }}>…………………………</span>
                </div>
              </div>
              <div style={{ fontSize: "7.5pt", color: "#6B5A4E", textAlign: "right", maxWidth: "62mm", lineHeight: 1.45 }}>
                Every answer is used <b>once</b>. Change your mind as often as you like —
                nothing counts until you hand it in.
              </div>
            </header>

            {live.map((c) => (
              <QuizBlock key={c} category={c} wines={wines} eventId={event.id} />
            ))}
          </section>
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
      <div style={{ display: "grid", gap: "1mm 4mm", marginBottom: "2.5mm",
                    gridTemplateColumns: wide ? "1fr" : `repeat(${Math.min(4, order.length)}, 1fr)` }}>
        {order.map((w, i) => (
          <div key={w.id} style={{ display: "flex", gap: "2mm", alignItems: "baseline", fontSize: wide ? "8pt" : "9pt" }}>
            <span style={{ fontFamily: "var(--font-mono), monospace", fontWeight: 600, color: "#6E1327" }}>
              {OPTION_LABELS[i]}
            </span>
            <span style={{ lineHeight: 1.35 }}>{optionFor(w, category)}</span>
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
