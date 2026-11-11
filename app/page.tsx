import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createEvent } from "./actions";
import { ID_SETS } from "@/lib/card";

export const dynamic = "force-dynamic";

export default async function Home() {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { wines: true, submissions: true } } },
  });

  return (
    <main className="page">
      <div className="masthead">
        <div>
          <div className="eyebrow">Paper in, opinions out</div>
          <h1>Wine Flight</h1>
        </div>
      </div>

      <div className="split">
        <section>
          <div className="section-title">Your tastings</div>
          {events.length === 0 ? (
            <p className="empty">Nothing yet. Start one on the right.</p>
          ) : (
            <div className="grid-wines">
              {events.map((e) => (
                <Link key={e.id} href={`/t/${e.id}`} className="card" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                  <div className="spread">
                    <h3>{e.name}</h3>
                    <span className="pill">{e.revealMode === "BLIND" ? "Blind" : "Open"}</span>
                  </div>
                  <p className="small" style={{ marginTop: ".35rem" }}>
                    {e._count.wines} {e._count.wines === 1 ? "wine" : "wines"} ·{" "}
                    {e._count.submissions} {e._count.submissions === 1 ? "card" : "cards"} scanned ·{" "}
                    {new Date(e.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="section-title">Start a new tasting</div>
          <form action={createEvent} className="stack" style={{ gap: "1rem" }}>
            <label className="field">
              <span className="label">What are we calling it</span>
              <input type="text" name="name" placeholder="Friday night, four reds" required />
            </label>

            <label className="field">
              <span className="label">How people are named</span>
              <select name="idSet" defaultValue="house">
                {Object.entries(ID_SETS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <span className="small">
                Two bubbles on the card, so nobody writes their name. Print with the same set you pick here.
              </span>
            </label>

            <label className="field">
              <span className="label">When people see the wine</span>
              <select name="revealMode" defaultValue="BLIND">
                <option value="BLIND">Blind — reveal after the cards are in</option>
                <option value="OPEN">Open — show the wine from the start</option>
              </select>
              <span className="small">
                Blind is a guessing game; open is a guided tasting. You can change your mind later.
              </span>
            </label>

            <button className="btn btn-primary" type="submit">Create tasting</button>
          </form>
        </section>
      </div>
    </main>
  );
}
