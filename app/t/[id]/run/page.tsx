import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { setStage } from "../../../actions";

export const dynamic = "force-dynamic";

/**
 * The host's phone during the tasting.
 *
 * Deliberately one column of large targets: this gets used standing up, in bad
 * light, holding a glass. Everything that isn't "which wine are we on and what
 * happens next" lives on the desktop screens instead.
 */

const STAGE = {
  UPCOMING: { pill: "Not poured", next: "POURING", cta: "Pour it", tone: "" },
  POURING: { pill: "Cards being filled in", next: "LOCKED", cta: "All cards in", tone: "pill-claret" },
  LOCKED: { pill: "Cards in, scored", next: "REVEALED", cta: "Reveal it", tone: "pill-warn" },
  REVEALED: { pill: "Revealed", next: null, cta: null, tone: "pill-olive" },
} as const;

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      wines: { orderBy: { position: "asc" }, include: { _count: { select: { submissions: true } } } },
      _count: { select: { tasters: true } },
    },
  });
  if (!event) notFound();

  const expected = event.guestCount;
  const active = event.wines.find((w) => w.stage === "POURING")
    ?? event.wines.find((w) => w.stage === "UPCOMING")
    ?? event.wines.find((w) => w.stage === "LOCKED");

  return (
    <main className="page" style={{ maxWidth: 560 }}>
      <div className="masthead">
        <div>
          <div className="eyebrow">
            <Link href={`/t/${event.id}`} style={{ textDecoration: "none" }}>{event.name}</Link> · running
          </div>
          <h1 style={{ fontSize: "clamp(1.6rem,7vw,2.2rem)" }}>
            {active ? `Wine ${active.position}` : "Flight finished"}
          </h1>
        </div>
      </div>

      <div className="row" style={{ marginBottom: "1.4rem" }}>
        <Link className="btn btn-primary" href={`/t/${event.id}?tab=scan`}>Scan cards</Link>
        <Link className="btn" href={`/t/${event.id}/present`}>Big screen ↗</Link>
      </div>

      <div className="stack" style={{ gap: ".8rem" }}>
        {event.wines.map((wine) => {
          const stage = STAGE[wine.stage as keyof typeof STAGE] ?? STAGE.UPCOMING;
          const count = wine._count.submissions;
          const isActive = active?.id === wine.id;
          const complete = expected != null && count >= expected;

          return (
            <div key={wine.id} className="card"
                 style={{ borderColor: isActive ? "var(--claret)" : undefined,
                          borderWidth: isActive ? 2 : 1 }}>
              <div className="spread">
                <div style={{ minWidth: 0 }}>
                  <span className="label">Wine {wine.position} · {wine.side === "RED" ? "red" : "white"}</span>
                  <h3 style={{ marginTop: ".1rem", fontSize: "1.05rem" }}>
                    {event.revealMode === "BLIND" && wine.stage !== "REVEALED"
                      ? <span style={{ color: "var(--ink-soft)" }}>hidden — {wine.teaser || "no teaser"}</span>
                      : wine.name}
                  </h3>
                </div>
                <span className={`pill ${stage.tone}`} style={{ whiteSpace: "nowrap" }}>{stage.pill}</span>
              </div>

              <div className="spread" style={{ marginTop: ".7rem", alignItems: "center" }}>
                <span className="small">
                  <b className="tabular" style={{ color: complete ? "var(--olive)" : "var(--ink)", fontSize: "1.1rem" }}>
                    {count}
                  </b>
                  {expected != null ? ` of ${expected} cards in` : " cards in"}
                  {complete && " — everyone"}
                </span>

                {stage.next && (
                  <form action={setStage}>
                    <input type="hidden" name="wineId" value={wine.id} />
                    <input type="hidden" name="stage" value={stage.next} />
                    <button className={`btn ${isActive ? "btn-primary" : ""}`} type="submit">{stage.cta}</button>
                  </form>
                )}
              </div>

              {wine.stage === "POURING" && expected != null && count < expected && (
                <p className="small" style={{ marginTop: ".5rem" }}>
                  Waiting on {expected - count} {expected - count === 1 ? "card" : "cards"}.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {event.wines.length === 0 && (
        <p className="empty">No wines in this flight yet.</p>
      )}

      <p className="small" style={{ marginTop: "1.6rem" }}>
        {event.revealMode === "BLIND"
          ? "Blind flight: the big screen keeps each wine covered until you reveal it here."
          : "Open flight: every screen shows the bottle from the start."}
      </p>
    </main>
  );
}
